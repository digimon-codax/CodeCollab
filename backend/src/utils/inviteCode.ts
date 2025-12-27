/**
 * Generate a random 8-character alphanumeric invite code
 * Format: XXXX-XXXX (e.g., AB12-XY89)
 */
export function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar looking chars (0,O,1,I)
    let code = '';

    for (let i = 0; i < 8; i++) {
        if (i === 4) {
            code += '-';
        }
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
}
