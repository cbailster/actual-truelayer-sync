import { jsx } from 'hono/jsx'
import { Layout } from './layout'

export const RedirectPage = () => {
  return (
    <Layout>
      <div class="mt-8 p-4 bg-base-200 rounded-lg">
        <h2 class="text-xl font-semibold mb-4">Authentication Successful</h2>
        <p class="mb-2">
          Your authentication with TrueLayer was successful. You can now use the code from the URL to complete the setup
          process.
        </p>
        <p class="mb-4">
          The full redirect URL is in your browser's address bar. The setup script will ask for this.
        </p>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Authorization Code</span>
          </label>
          <input type="text" id="auth-code" class="input input-bordered" readOnly />
        </div>
      </div>
    </Layout>
  )
}