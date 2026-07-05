import { jsx } from 'hono/jsx'
import type { Child } from 'hono/jsx'

export const Layout = (props: { children: Child }) => (
  <html data-theme="cupcake">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Actual-TrueLayer Sync</title>
      <link href="/public/styles.css" rel="stylesheet" />
      <script src="/public/htmx.min.js"></script>
    </head>
    <body>
      <div class="container mx-auto p-4">
        <h1 class="text-2xl font-bold">Actual-TrueLayer Sync</h1>
        {props.children}
      </div>
    </body>
  </html>
)