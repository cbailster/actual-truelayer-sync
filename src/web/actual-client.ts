import {
  initActual,
  getBudgets as actualGetBudgets,
  getAccounts as actualGetAccounts,
  shutdownActual,
  selectBudget,
} from '../actual/actual'
import type { Config } from '../config/schema'

export type ActualConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
export type ActualAccountData = {
  id: string
  name: string
  closed: boolean
  budgetId: string 
  budgetName: string
}

/**
 * A wrapper for the Actual Budget API client.
*
 * Manages the connection lifecycle (init/shutdown) and provides methods
 * to interact with the Actual Budget server.
 */
export class ActualClient {
  private config: Config['env']
  public status: ActualConnectionStatus = 'disconnected'
  public errorMessage?: string
  public accounts: ActualAccountData[] = []

  constructor(config: Config['env']) {
    this.config = config
  }

  /**
   * Connects to the Actual Budget server.
   */
  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return
    }

    this.status = 'connecting'
    this.errorMessage = undefined

    try {
      await initActual({
        serverURL: this.config.ACTUAL_SERVER_URL,
        password: this.config.ACTUAL_SERVER_PASSWORD,
        verbose: false,
      })
      this.status = 'connected'
    } catch (err) {
      this.status = 'error'
      this.errorMessage = err instanceof Error ? err.message : 'Unknown error connecting to Actual.'
      console.error('Failed to connect to Actual Budget:', err)
      // Re-throw so the caller can handle it
      throw err
    }
  }

  /**
   * Disconnects from the Actual Budget server.
   */
  async disconnect(): Promise<void> {
    if (this.status === 'connected') {
      await shutdownActual()
      this.status = 'disconnected'
    }
  }

  async getAccounts() {
    await this.connect()
    const budgets = await actualGetBudgets()
    for (const budget of budgets) {
      await selectBudget(budget.groupId)
      this.accounts = (await actualGetAccounts()).map((account) => ({
        ...account,
        budgetId: budget.groupId,
        budgetName: budget.name,
      }))
    }
  }

  accountWithID(id: string) {
    return this.accounts.find((account) => account.id === id)
  }
}