import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0';

type Review = {
  id: string;
  user_id: string | null;
  motoboy_id: string | null;
  subject_name: string | null;
  subject_document: string | null;
  document_type: string;
  storage_bucket: string | null;
  file_path: string | null;
  document_url: string | null;
  mime_type: string | null;
  attempt_count: number;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash-lite';
const apiKeys = (Deno.env.get('GEMINI_API_KEYS') || '')
  .split(',')
  .map((key) => key.trim())
  .filter(Boolean);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { reviewId } = await req.json();
    if (!reviewId) throw new Error('reviewId e obrigatorio.');
    if (apiKeys.length === 0) throw new Error('GEMINI_API_KEYS nao configurado.');

    const { data: review, error: reviewError } = await supabase
      .from('document_ai_reviews')
      .select('*')
      .eq('id', reviewId)
      .single<Review>();

    if (reviewError) throw reviewError;

    await markProcessing(review);

    const file = await loadDocument(review);
    const prompt = buildPrompt(review);
    const startIndex = review.attempt_count % apiKeys.length;

    let lastError = '';
    for (let offset = 0; offset < apiKeys.length; offset += 1) {
      const keyIndex = (startIndex + offset) % apiKeys.length;
      const result = await callGemini(apiKeys[keyIndex], prompt, file);

      if (result.ok) {
        const extracted = parseJson(result.text);
        await saveSuccess(review, extracted, result.raw, keyIndex + 1);
        await applyExtractedData(review, extracted);
        return json({ ok: true, keyIndex: keyIndex + 1, extracted });
      }

      lastError = result.error;
      if (!result.retryable) break;
    }

    await saveFailure(review, lastError);
    return json({ ok: false, error: lastError }, 502);
  } catch (error) {
    return json({ ok: false, error: error.message }, 400);
  }
});

async function markProcessing(review: Review) {
  await supabase
    .from('document_ai_reviews')
    .update({
      status: 'processing',
      error_message: null,
      attempt_count: review.attempt_count + 1,
      gemini_model: model,
    })
    .eq('id', review.id);
}

async function loadDocument(review: Review) {
  if (review.storage_bucket && review.file_path) {
    const { data, error } = await supabase.storage
      .from(review.storage_bucket)
      .download(review.file_path);
    if (error) throw error;
    return {
      mimeType: review.mime_type || data.type || 'application/octet-stream',
      data: await blobToBase64(data),
    };
  }

  if (review.document_url) {
    const response = await fetch(review.document_url);
    if (!response.ok) throw new Error(`Falha ao baixar documento: ${response.status}`);
    const blob = await response.blob();
    return {
      mimeType: review.mime_type || response.headers.get('content-type') || 'application/octet-stream',
      data: await blobToBase64(blob),
    };
  }

  throw new Error('Documento sem file_path ou document_url.');
}

function buildPrompt(review: Review) {
  return [
    'Voce e um OCR estruturado para cadastro da plataforma ArkGo.',
    'Leia o documento enviado e retorne apenas JSON valido, sem markdown.',
    'Campos esperados: full_name, document_number, birth_date, cnh_number, cnh_category, cnh_expires_at, vehicle_plate, vehicle_model, vehicle_year, address, confidence, notes.',
    'Use null quando um campo nao existir ou nao estiver legivel.',
    `Tipo do documento: ${review.document_type}.`,
    `Nome esperado: ${review.subject_name || 'nao informado'}.`,
    `Documento esperado: ${review.subject_document || 'nao informado'}.`,
  ].join('\n');
}

async function callGemini(apiKey: string, prompt: string, file: { mimeType: string; data: string }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: file.mimeType, data: file.data } },
          ],
        }],
      }),
    },
  );

  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = raw?.error?.message || `Gemini HTTP ${response.status}`;
    return {
      ok: false as const,
      error: message,
      retryable: [403, 429, 500, 502, 503, 504].includes(response.status),
    };
  }

  return {
    ok: true as const,
    text: raw?.candidates?.[0]?.content?.parts?.[0]?.text || '{}',
    raw,
  };
}

function parseJson(text: string) {
  const clean = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  return JSON.parse(clean);
}

async function saveSuccess(review: Review, extracted: Record<string, unknown>, raw: Record<string, unknown>, keyIndex: number) {
  await supabase
    .from('document_ai_reviews')
    .update({
      status: 'completed',
      extracted_data: extracted,
      raw_response: raw,
      error_message: null,
      gemini_model: model,
      gemini_key_index: keyIndex,
      analyzed_at: new Date().toISOString(),
    })
    .eq('id', review.id);
}

async function saveFailure(review: Review, errorMessage: string) {
  await supabase
    .from('document_ai_reviews')
    .update({
      status: 'failed',
      error_message: errorMessage,
      gemini_model: model,
    })
    .eq('id', review.id);
}

function validateCPF(cpf: unknown): boolean {
  if (!cpf) return false;
  const clean = String(cpf).replace(/[^\d]/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

function validateCNH(cnh: unknown): boolean {
  if (!cnh) return false;
  const clean = String(cnh).replace(/[^\d]/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let v = 0;
  for (let i = 0, j = 9; i < 9; ++i, --j) {
    v += parseInt(clean.charAt(i), 10) * j;
  }
  
  let vl1 = v % 11;
  let dsc = (vl1 >= 10) ? 0 : vl1;
  
  if (dsc !== parseInt(clean.charAt(9), 10)) {
    return false;
  }
  
  v = 0;
  for (let i = 0, j = 1; i < 9; ++i, ++j) {
    v += parseInt(clean.charAt(i), 10) * j;
  }
  
  let x = v % 11;
  let vl2 = (x >= 10) ? 0 : x;
  
  if (vl1 >= 10) {
    if (vl2 >= 0 && vl2 <= 2) {
      vl2 = 0;
    } else {
      vl2 = vl2 - 2;
    }
  }
  
  return dsc.toString() + vl2.toString() === clean.substring(9, 11);
}

function validatePlate(plate: unknown): boolean {
  if (!plate) return false;
  const clean = String(plate).toUpperCase().replace(/[-\s]/g, '');
  const regexTraditional = /^[A-Z]{3}[0-9]{4}$/;
  const regexMercosul = /^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/;
  return regexTraditional.test(clean) || regexMercosul.test(clean);
}

async function applyExtractedData(review: Review, extracted: Record<string, unknown>) {
  let isReleased = true;
  const validationNotes: string[] = [];

  // 1. Validar CPF se extraído
  if (extracted.document_number) {
    const cleanDoc = String(extracted.document_number).replace(/[^\d]/g, '');
    if (cleanDoc.length === 11) {
      if (!validateCPF(extracted.document_number)) {
        isReleased = false;
        validationNotes.push("CPF extraído possui dígito verificador inválido.");
      }
    }
  }

  // 2. Validar CNH se extraída
  if (extracted.cnh_number) {
    if (!validateCNH(extracted.cnh_number)) {
      isReleased = false;
      validationNotes.push("CNH extraída possui dígito verificador inválido.");
    }
  }

  // 3. Validar Placa se extraída
  if (extracted.vehicle_plate) {
    if (!validatePlate(extracted.vehicle_plate)) {
      validationNotes.push("Placa do veículo extraída possui formato inválido.");
    }
  }

  // Se houver algum alerta ou documento inválido, anota no campo notes e salva no banco
  if (validationNotes.length > 0) {
    const existingNotes = extracted.notes ? String(extracted.notes) : '';
    extracted.notes = (existingNotes ? existingNotes + " | " : "") + "[ALERTA DE SEGURANÇA] " + validationNotes.join(" ");
    
    await supabase
      .from('document_ai_reviews')
      .update({ extracted_data: extracted })
      .eq('id', review.id);
  }

  if (review.user_id) {
    const userUpdate = compact({
      name: extracted.full_name,
      document: extracted.document_number,
    }) as Record<string, unknown>;

    // Só libera automaticamente se todas as validações de segurança passaram
    if (isReleased) {
      userUpdate.is_released = true;
      userUpdate.status = 'active';
      userUpdate.block_reason = null; // Limpa o motivo do bloqueio
    } else {
      const friendlyDetails = validationNotes.map(n => {
        if (n.includes("CPF")) return "o CPF informado possui uma inconsistência matemática nos dígitos";
        if (n.includes("CNH")) return "a CNH informada possui uma inconsistência matemática nos dígitos";
        if (n.includes("Placa")) return "a placa do veículo possui um formato inválido";
        return n.toLowerCase();
      }).join(" e ");

      const friendlyMsg = `Olá! Notamos que ${friendlyDetails}. Por favor, revise os dados digitados e reenvie uma foto bem nítida e legível do seu documento para podermos liberar seu acesso rapidamente. Obrigado!`;
      
      userUpdate.is_released = false;
      userUpdate.status = 'inactive';
      userUpdate.block_reason = friendlyMsg; // Mensagem amigável para exibição no aplicativo do motorista
      
      // Salva o erro na própria revisão para dar feedback imediato
      await supabase
        .from('document_ai_reviews')
        .update({ status: 'failed', error_message: `Falha na validação automática: ${validationNotes.join(' ')}` })
        .eq('id', review.id);
    }

    await supabase.from('users').update(userUpdate).eq('id', review.user_id);
  }

  if (review.motoboy_id) {
    const driverUpdate = compact({
      vehicle_plate: extracted.vehicle_plate,
      vehicle_model: extracted.vehicle_model,
    });

    if (Object.keys(driverUpdate).length > 0) {
      await supabase.from('motoboys').update(driverUpdate).eq('id', review.motoboy_id);
    }
  }
}

function compact(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  );
}

async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
