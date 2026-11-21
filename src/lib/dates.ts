/* Helpers de data/hora no fuso LOCAL do usuário.
   Nunca usar toISOString().slice() para exibição: isso converte para UTC
   e desloca horários (ex.: 10:00 em America/Sao_Paulo vira 13:00). */

const pad = (n: number) => String(n).padStart(2, '0')

export function localDateInput(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function localTimeInput(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
