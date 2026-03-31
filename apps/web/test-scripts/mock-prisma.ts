/**
 * In-memory Prisma mock — satisfies the import so match.ts loads in tests.
 *
 * loadDeckIntoPlayerState() is never called in existing tests (deckId is
 * not passed), so we only need the module to resolve. If future tests need
 * deck loading, expand the stubs here.
 */

const mockPrisma = {
  deck: {
    async findUnique(_args: any): Promise<null> {
      return null;
    },
  },
};

export default mockPrisma;
