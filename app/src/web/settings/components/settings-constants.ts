export const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Fortaleza',
  'America/Recife',
  'America/Bahia',
  'America/Manaus',
  'America/Cuiaba',
  'America/Porto_Velho',
  'America/Rio_Branco',
  'America/Belem',
  'America/Noronha',
  'UTC',
]

export const GOOGLE_STATUS_MESSAGES: Record<string, string> = {
  connected: 'Conta Google conectada.',
  error: 'Não foi possível conectar a conta Google.',
  no_refresh: 'Google não devolveu refresh token. Tente reconectar com consent.',
  limit: 'Limite de contas Google atingido.',
  calendar_error:
    'Conta conectada, mas não foi possível importar calendários. Conceda acesso ao Google Calendar e reconecte (contas corporativas podem exigir liberação do admin).',
}
