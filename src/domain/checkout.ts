import { deliveryModes, type DeliveryMode } from './commerce';

export const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
export type CheckoutData = {
  nome: string; telefone: string; cpf: string; email: string; recebedor: string; mensagem: string;
  cep: string; endereco: string; numero: string; complemento: string; bairro: string; cidade: string; estado: string;
  data: string; periodo: string; mode: DeliveryMode;
};
export const emptyCheckout: CheckoutData = {
  nome: '', telefone: '', cpf: '', email: '', recebedor: '', mensagem: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', data: '', periodo: '', mode: 'padrao',
};
export const demoCheckout: CheckoutData = {
  nome: 'Cliente Demonstração', telefone: '11999990000', cpf: '52998224725', email: 'cliente@example.com', recebedor: 'Pessoa Especial', mensagem: 'Um carinho para deixar seu dia mais bonito!', cep: '01310100', endereco: 'Avenida Exemplo', numero: '123', complemento: '', bairro: 'Jardim das Flores', cidade: 'São Paulo', estado: 'SP', data: '', periodo: '', mode: 'padrao',
};
export const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
export function validCpf(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  return [9, 10].every((length) => {
    const sum = [...digits.slice(0, length)].reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    return ((sum * 10) % 11) % 10 === Number(digits[length]);
  });
}
export function validateCheckout(data: CheckoutData, date = today()): Partial<Record<keyof CheckoutData, string>> {
  const errors: Partial<Record<keyof CheckoutData, string>> = {};
  const required: (keyof CheckoutData)[] = ['nome', 'recebedor', 'endereco', 'numero', 'bairro', 'cidade'];
  for (const key of required) if (!data[key].trim()) errors[key] = 'Preencha este campo.';
  for (const [key, value] of Object.entries(data)) if (value.length > 200) errors[key as keyof CheckoutData] = 'Use no máximo 200 caracteres.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Informe um e-mail válido.';
  if (!/^[1-9]{2}\d{8,9}$/.test(data.telefone.replace(/\D/g, ''))) errors.telefone = 'Informe o telefone com DDD.';
  if (!validCpf(data.cpf)) errors.cpf = 'Informe um CPF válido ou use os dados de demonstração.';
  if (!/^\d{8}$/.test(data.cep.replace(/\D/g, '')) || /^0+$/.test(data.cep.replace(/\D/g, ''))) errors.cep = 'Informe um CEP válido.';
  if (!states.includes(data.estado)) errors.estado = 'Selecione um estado.';
  if (!Object.hasOwn(deliveryModes, data.mode)) errors.mode = 'Selecione uma modalidade de entrega.';
  if (data.mode === 'agendada') {
    const parsed = new Date(`${data.data}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.data) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== data.data || data.data < date) errors.data = 'Escolha uma data válida, a partir de hoje.';
    if (!['08h às 12h', '12h às 18h', '18h às 22h'].includes(data.periodo)) errors.periodo = 'Selecione o período de entrega.';
  }
  return errors;
}
