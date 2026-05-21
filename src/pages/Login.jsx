import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Lock, Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password, rememberMe);
      navigate('/', { replace: true });
    } catch (err) {
      if (err.message?.includes('Invalid login')) {
        setError('Email ou senha inválidos.');
      } else {
        setError(err.message || 'Erro ao fazer login.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/favicon.png" alt="ArkGo" className="login-favicon-img" />
          </div>
          <h1 className="login-title">ArkGo Admin</h1>
          <p className="login-subtitle">Painel administrativo</p>
        </div>

        <Card>
          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="login-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="admin@arkgo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            <label className="login-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <span>Manter conectado</span>
            </label>

            <Button type="submit" loading={loading} icon={Lock}>
              Entrar
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
