// Mirrors the API's Identity password rule (Program.cs:
// options.Password.RequiredLength = 8) so the client can show the same
// error before round-tripping to the server.
export const MIN_PASSWORD_LENGTH = 8

export function getPasswordError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  return null
}
