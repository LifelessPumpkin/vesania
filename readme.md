
# Vesania

Capstone project for CEN4020L

## Dependencies

npm i prisma @prisma/client
npx prisma migrate dev

## Convenient Tools

you can do these commands from root
npm run db:up
npm run db:down
npm run dev

there is a swagger page at /api-docs to test endpoints
when you want to add an endpoint, you must also add the route in /apps/web/app/api/openapi/route.ts if you want to see it in the swagger ui

1. Someone edits schema.prisma
2. They run prisma migrate dev which creates a new migration folder like prisma/migrations/2026xxxx_addRunState/
3. They commit schema.prisma and the new prisma/migrations/... folder
4. Everyone else pulls and runs prisma migrate dev (or prisma migrate deploy) and their local DB updates automatically

## DB Design

Make one table that represents “what this card is” 😄, and physical copies point to it 😄.
 • CardDefinition = Sword / Fireball / Eruptor (type, name, rules text, etc.) 😄
 • Card = physical copy (publicCode, ownerId, definitionId) 😄

Then you don’t need multiple foreign keys or a weird enum mapping 😄.

Sketch:
 • CardDefinition { id, type (CHARACTER|ITEM|SPELL), name, rarity, description, effectJson, ... } 😄
 • Card { id, publicCode, status, ownerId?, definitionId } 😄

Your game-specific “Character” details can either live:
 • directly on CardDefinition (if you’re ok with JSON / optional fields) 😄
 • or in subtype tables (see Pattern B) 😄

## To-Do List

- Dockerizing the next app
- CI/CD for the deployment with github actions to my server
- Create tunnel config stuff for app
- Onboarding everyone
