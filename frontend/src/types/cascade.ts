// Cascade API Types
// Based on actual Cascade source: backend/app/schemas/actions.py

export type Decision = 'AUTO_APPROVED' | 'APPROVAL_REQUIRED' | 'BLOCKED'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type Reversibility = 'FULL' | 'PARTIAL' | 'NONE'
export type ImpactLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE'
export type DataSensitivity = 'NONE' | 'INTERNAL' | 'PII' | 'BULK_PII'
export type NodeStatus = 'WILL_EXECUTE' | 'BLOCKED' | 'WOULD_FAIL' | 'SKIPPED_LIMIT'
export type ActionStatus = 'PARSED' | 'NEEDS_CLARIFICATION' | 'SIMULATED' | 'BLOCKED' | 
  'AUTO_APPROVED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'STALE' | 
  'EXECUTING' | 'EXECUTED' | 'PARTIALLY_EXECUTED' | 'FAILED'

export interface PolicyReason {
  code: string
  message: string
}

export interface RiskDimensions {
  financial: number
  irreversibility: number
  downstream: number
  customer: number
  data: number
}

export interface RiskAssessment {
  total: number
  level: RiskLevel
  dimensions: RiskDimensions
}

export interface BlastRadius {
  agents_affected: string[]
  agent_count: number
  downstream_actions: number
  records_affected: string[]
  record_count: number
  systems_affected?: string[]
  money_out: string  // Decimal as string
  money_in: string
  net_money_out: string
  customer_impact: ImpactLevel
  data_sensitivity: DataSensitivity
  reversibility: Reversibility
  irreversible_nodes: string[]
  blocked_nodes: string[]
  would_fail_nodes: string[]
  skipped_nodes: string[]
}

export interface NodeOut {
  id: string
  depth: number
  agent_id: string
  tool_id: string
  params: Record<string, any>
  parent_id: string | null
  trigger_type: 'ROOT' | 'AGENT_REACTION'
  trigger_event: string | null
  rule_id: string | null
  rule_version: number | null
  trigger_condition: string | null
  trigger_reason: string | null
  authorization: {
    granted: boolean
    code: string | null
    message: string
  } | null
  required: boolean
  status: NodeStatus
  status_code: string | null
  status_message: string | null
  summary: string
  reversibility: Reversibility
  customer_impact: ImpactLevel
  data_sensitivity: DataSensitivity
  changes: any[]
  creations: any[]
  money: any[]
  events: any[]
}

export interface EdgeOut {
  source: string
  target: string
  kind: 'TRIGGER' | 'DUPLICATE' | 'CYCLE'
  event: string | null
  rule_id: string | null
  rule_version: number | null
}

export interface ConsequenceReport {
  engine_version: string
  proposer_agent_id: string
  root_tool_id: string
  nodes: NodeOut[]
  edges: EdgeOut[]
  blast_radius: BlastRadius
  direct_effect: BlastRadius | null
  fingerprint: string
  reads: any[]
  config: any | null
  execution_order: string[]
  blocking: Array<{ code: string; message: string; node_id?: string }>
  warnings: any[]
  limit_reached: boolean
  cycle_detected: boolean
}

export interface ActionOut {
  id: string
  status: ActionStatus
  decision: Decision | null
  agent_id: string
  tool_id: string | null
  parameters: Record<string, any>
  raw_text: string | null
  parser: string | null
  proposed_by: string | null
  idempotency_key: string | null
  parent_action_id: string | null
  clarification: Record<string, any> | null
  interpretation: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface DecisionOut {
  decision: Decision
  reasons: PolicyReason[]
  money_out: string
  policy_version: string
}

export interface ApprovalOut {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
  expires_at: string
  decided_by: string | null
  decided_at: string | null
  comment: string | null
}

export interface ExecutionOut {
  attempt: number
  status: 'RUNNING' | 'SUCCEEDED' | 'PARTIAL' | 'FAILED'
  steps: any[]
  error: any | null
  started_at: string
  finished_at: string | null
}

export interface CascadeActionDetail {
  action: ActionOut
  report: ConsequenceReport | null
  risk: RiskAssessment | null
  decision: DecisionOut | null
  explanation: any | null
  approval: ApprovalOut | null
  executions: ExecutionOut[]
}

// Simulation request to commerce backend
export interface SimulateRefundRequest {
  order_id: number
  reason?: string
}

// Commerce backend response wrapping Cascade action
export interface SimulateRefundResponse {
  status: 'simulated' | 'error'
  cascade_action_id: string | null
  cascade_action: CascadeActionDetail | null
  message?: string
  error?: string
}
