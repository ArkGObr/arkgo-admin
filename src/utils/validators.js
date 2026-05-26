/**
 * utilitários de validação sintática e matemática para documentos brasileiros (Camada 1).
 * Desenvolvido para a plataforma ArkGo.
 */

/**
 * Valida o CPF usando o algoritmo de dígitos verificadores (Módulo 11).
 * Funciona de forma instantânea e sem custos no front ou no back.
 * 
 * @param {string|number} cpf - O CPF a ser validado (com ou sem máscara)
 * @returns {boolean} - Retorna true se o CPF for matematicamente válido.
 */
export function validateCPF(cpf) {
  if (!cpf) return false;
  
  // Remove pontos, hifens e caracteres não numéricos
  const cleanCPF = String(cpf).replace(/[^\d]/g, '');
  
  // Deve ter exatamente 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Rejeita sequências conhecidas de números repetidos
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(9), 10)) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(10), 10)) return false;
  
  return true;
}

/**
 * Valida a CNH usando o algoritmo oficial de dígitos verificadores (Módulo 11 adaptado).
 * Funciona de forma instantânea e sem custos.
 * 
 * @param {string} cnh - O número da CNH a ser validada (com ou sem máscara)
 * @returns {boolean} - Retorna true se a CNH for matematicamente consistente.
 */
export function validateCNH(cnh) {
  if (!cnh) return false;
  
  // Remove caracteres não numéricos
  const cleanCNH = String(cnh).replace(/[^\d]/g, '');
  
  // CNH possui exatamente 11 dígitos
  if (cleanCNH.length !== 11) return false;
  
  // Rejeita sequências de números repetidos
  if (/^(\d)\1{10}$/.test(cleanCNH)) return false;
  
  // Primeiro dígito verificador: peso decrescente de 9 a 1
  let v = 0;
  for (let i = 0, j = 9; i < 9; ++i, --j) {
    v += parseInt(cleanCNH.charAt(i), 10) * j;
  }
  
  let vl1 = v % 11;
  let dsc = (vl1 >= 10) ? 0 : vl1;
  
  if (dsc !== parseInt(cleanCNH.charAt(9), 10)) {
    return false;
  }
  
  // Segundo dígito verificador: peso crescente de 1 a 9
  v = 0;
  for (let i = 0, j = 1; i < 9; ++i, ++j) {
    v += parseInt(cleanCNH.charAt(i), 10) * j;
  }
  
  let x = v % 11;
  let vl2 = (x >= 10) ? 0 : x;
  
  // Ajuste final da regra da CNH para o segundo dígito
  if (vl1 >= 10) {
    if (vl2 >= 0 && vl2 <= 2) {
      vl2 = 0;
    } else {
      vl2 = vl2 - 2;
    }
  }
  
  return dsc.toString() + vl2.toString() === cleanCNH.substring(9, 11);
}

/**
 * Valida o RG (Registro Geral) de forma robusta e flexível.
 * 
 * NOTA SOBRE RG NO BRASIL: 
 * Como os RGs tradicionais são emitidos de forma independente por cada estado (SSP), 
 * não existe um algoritmo matemático universal único que valide todos os RGs do Brasil.
 * No entanto, esta função aplica uma limpeza rigorosa, validação de padrões comuns,
 * tamanho seguro (5 a 14 caracteres) e impede sequências idênticas.
 * 
 * IMPORTANTE: Com a nova CIN (Carteira de Identidade Nacional) que está unificando o RG,
 * o número do RG passa a ser o próprio CPF. Se for o caso, utilize a função validateCPF().
 * 
 * @param {string} rg - O número do RG a ser validado
 * @returns {boolean} - Retorna true se o formato e padrão do RG forem aceitáveis.
 */
export function validateRG(rg) {
  if (!rg) return false;
  
  // Remove pontos, hifens e espaços, aceitando letras (já que RGs podem terminar com 'X' ou conter letras)
  const cleanRG = String(rg).toUpperCase().replace(/[-\s.]/g, '');
  
  // RGs tradicionais têm de 5 a 14 caracteres. Alguns estados aceitam 'X' ou 'x' no dígito final (ex: SP e RJ).
  // A Regex valida de 5 a 13 dígitos numéricos seguidos de um dígito numérico ou X.
  const regexRG = /^[0-9]{5,13}[0-9X]$/;
  
  if (!regexRG.test(cleanRG)) return false;
  
  // Rejeita sequências repetidas e fáceis (ex: "111111111" ou "AAAAAAA")
  if (/^(\w)\1+$/.test(cleanRG)) return false;
  
  return true;
}

/**
 * Valida placas de veículos nos formatos Tradicional Brasileiro (AAA-1234) ou Mercosul (AAA1A23).
 * 
 * @param {string} plate - A placa do veículo a ser validada
 * @returns {boolean} - Retorna true se a placa seguir os padrões oficiais brasileiros.
 */
export function validatePlate(plate) {
  if (!plate) return false;
  
  // Remove espaços e hifens e deixa em maiúsculo
  const cleanPlate = String(plate).toUpperCase().replace(/[-\s]/g, '');
  
  // Formato Clássico: 3 letras e 4 números (ex: ABC1234)
  const regexTraditional = /^[A-Z]{3}[0-9]{4}$/;
  
  // Formato Mercosul: 3 letras, 1 número, 1 letra, 2 números (ex: ABC1D23)
  const regexMercosul = /^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/;
  
  return regexTraditional.test(cleanPlate) || regexMercosul.test(cleanPlate);
}
