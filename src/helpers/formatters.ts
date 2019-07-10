export function pluralize(singular: string, plural: string, amount: number): string {
    return amount === 1 ? singular : plural;
}
