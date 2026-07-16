import { jsx } from 'hono/jsx'
import { Layout } from './layout'
import { Connection } from '../config/schema'
import { ZodError } from 'zod'

interface MapAccountPageProps {
  tokens: { access_token: string, refresh_token: string }
  connection: Connection
  mappingOptions: { id:string, name: string}[]
  formData?: Record<string, string>
  errors?: ZodError
}

export const MapAccountPage = ({ tokens, connection, mappingOptions, formData, errors }: MapAccountPageProps) => {
  // Use flatten() to get a simple object with form-level and field-level errors.
  const flatErrors = errors?.flatten()
  // Combine all errors into a single array for easy rendering.
  const allErrors = [
    ...(flatErrors?.formErrors ?? []),
    ...Object.values(flatErrors?.fieldErrors ?? {}).flatMap((e) => e),
  ]

  return (
    <Layout>
      <div class="mt-8 p-4 bg-base-200 rounded-lg">
        <h2 class="text-xl font-semibold mb-4">Authentication Successful</h2>
        <p class="mb-4">Your bank has been successfully authenticated. Now, let's set up the connection.</p>

        {errors && (
           <div role="alert" class="alert alert-error mb-4">
             <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             <span>
               <h3 class="font-bold">Please fix the following issues:</h3>
               <div class="text-xs">
                 <ul class="list-disc ml-6">
                   {allErrors.map((e) => <li>{e}</li>)}
                 </ul>
               </div>
             </span>
           </div>
         )}

        <form action="/map-accounts" method="post">
          <input type="hidden" name="accessToken" value={tokens.access_token} />
          <input type="hidden" name="refreshToken" value={tokens.refresh_token} />

          <div class="form-control grid grid-cols-4 gap-x-4 items-center">
            <label class="label justify-end">
            <span class="label-text">Connection Name</span>
            </label>
            <input type="text" name="connectionName" class="input" value={connection.name} required />
          </div>
          <div class="mt-6">
            <h3 class="text-lg font-semibold mb-2">Map Accounts</h3>
            <div class="space-y-4">
              {connection.accounts.map((account) => (
                <div class="grid grid-cols-4 gap-x-4 items-center" key={account.trueLayerId}>
                  <label class="label justify-end">
                    <span class="label-text">{account.friendlyName}</span>
                  </label>
                  <select name={`map-${account.trueLayerId}`} class="select select-bordered w-full max-w-md">
                    {mappingOptions.map((option) => (
                      <option value={option.id} selected={account.actualId ? account.actualId === option.id : option.id === 'IGNORE'}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div class="form-control mt-6">
            <button class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </Layout>
  )
}