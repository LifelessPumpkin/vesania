
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

npx prisma migrate dev     # change schema + migrate
npx prisma migrate reset   # nuke DB + reapply + seed
npx prisma studio          # open DB GUI
npx prisma db seed         # run seed manually

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
