import { Round } from '../gameRecords/Round'
import { ParsedOperation, ParsedOperationList } from './ParsedOperation'

export abstract class BaseAnalyser {
  init?: (...args: any) => Promise<boolean>

  end?: (...args: any) => Promise<void>

  abstract analyseOperations (parsedOperationList: ParsedOperationList, round: Round): Promise<{ choice: ParsedOperation, info?: string }>
}
