
# Vesania

Capstone project for CEN4020L

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

## Onboarding

1. Download docker desktop
2. Launch the database container

    ```bash
    npm run db:up
    ```

3. Download node
    - homebrew intall node

    > **_NOTE:_** If it is giving an error about node version, run "which node" to determine what version is downloaded. Link it to  homebrew if not already.

    ```bash
    brew link --overwrite node
    ```

4. Download node_modules

    ```bash
    cd apps/web
    npm install
    ```

5. Generate the prisma client

    ```bash
    npx prisma generate
    ```

6. Run the web app at <http://localhost:3000>

    ```bash
    npm run dev
    ```
