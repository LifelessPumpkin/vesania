
# Vesania

Capstone project for CEN4020L

Dependencies

npm i prisma @prisma/client
npx prisma init

you can do these commands from root
npm run db:up
npm run db:down
npm run dev

there is a swagger page at /api-docs to test endpoints
when you want to add an endpoint, you must also add the route in /apps/web/app/api/openapi/route.ts if you want to see it in the swagger ui
