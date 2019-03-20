export function pluralize(singular: string, plural: string, amount: number): string {
    if (amount === 1) {
        return singular;
    }
    return plural;
}
