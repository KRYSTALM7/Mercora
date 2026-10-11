'use client'

import { AlertTriangle, CheckCircle, XCircle, GitBranch, DollarSign, Users } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { CascadeActionDetail } from '@/types/cascade'
import { formatCurrency } from '@/lib/format'

interface CascadeSimulationModalProps {
  isOpen: boolean
  onClose: () => void
  cascadeAction: CascadeActionDetail | null
  isLoading: boolean
  error: string | null
}

export default function CascadeSimulationModal({
  isOpen,
  onClose,
  cascadeAction,
  isLoading,
  error,
}: CascadeSimulationModalProps) {
  if (!isOpen) return null

  const renderRiskBadge = (level: string | undefined, score: number | undefined) => {
    if (!level) return null
    
    const colors = {
      LOW: 'bg-green-50 text-green-700',
      MEDIUM: 'bg-yellow-50 text-yellow-700',
      HIGH: 'bg-red-50 text-red-700',
      CRITICAL: 'bg-red-100 text-red-900',
    }
    
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium ${colors[level as keyof typeof colors]}`}>
        Risk: {level} {score !== undefined && `(${score}/100)`}
      </span>
    )
  }

  const renderDecisionBadge = (decision: string | undefined) => {
    if (!decision) return null
    
    const styles = {
      AUTO_APPROVED: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle },
      APPROVAL_REQUIRED: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: AlertTriangle },
      BLOCKED: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
    }
    
    const style = styles[decision as keyof typeof styles] || styles.AUTO_APPROVED
    const Icon = style.icon
    
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-4 h-4" />
        {decision.replace('_', ' ')}
      </span>
    )
  }

  return (
    <Modal
      title="Cascade Consequence Simulation"
      onClose={onClose}
      maxWidth="max-w-3xl"
    >
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Spinner size="lg" />
          <p className="text-slate-600 mt-4">Simulating consequences...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Simulation Failed</p>
              <p className="text-sm">{error}</p>
              <p className="text-xs text-red-600 mt-2">
                No refund was processed. The order remains unchanged.
              </p>
            </div>
          </div>
        </div>
      )}

      {cascadeAction && !isLoading && !error && (
        <div className="space-y-6">
          {/* Header: Status and Decision */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <Badge variant="info">SIMULATED</Badge>
              <p className="text-xs text-slate-500 mt-1">No business state was changed</p>
            </div>
            <div className="flex gap-2">
              {cascadeAction.risk && renderRiskBadge(cascadeAction.risk.level, cascadeAction.risk.total)}
              {cascadeAction.decision && renderDecisionBadge(cascadeAction.decision.decision)}
            </div>
          </div>

          {/* Proposed Action */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Proposed Business Action</h3>
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">
                    {cascadeAction.action.agent_id} → {cascadeAction.action.tool_id}
                  </p>
                  <pre className="text-xs text-slate-600 mt-2 whitespace-pre-wrap font-mono">
                    {JSON.stringify(cascadeAction.action.parameters, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Blast Radius */}
          {cascadeAction.report && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Blast Radius</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-slate-500" />
                    <p className="text-xs text-slate-500">Money Out</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(parseFloat(cascadeAction.report.blast_radius.money_out))}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-slate-500" />
                    <p className="text-xs text-slate-500">Agents</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {cascadeAction.report.blast_radius.agent_count}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Downstream</p>
                  <p className="text-lg font-bold text-slate-900">
                    {cascadeAction.report.blast_radius.downstream_actions}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Records</p>
                  <p className="text-lg font-bold text-slate-900">
                    {cascadeAction.report.blast_radius.record_count}
                  </p>
                </div>
              </div>
              
              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Reversibility</p>
                <p className="text-sm font-medium text-slate-900">
                  {cascadeAction.report.blast_radius.reversibility}
                </p>
              </div>
            </div>
          )}

          {/* Consequence Graph (Downstream Actions) */}
          {cascadeAction.report && cascadeAction.report.nodes.length > 1 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Downstream Actions</h3>
              <div className="space-y-2">
                {cascadeAction.report.nodes.slice(1).map((node) => (
                  <div key={node.id} className="p-3 bg-slate-50 rounded-lg border-l-2 border-slate-300">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {node.agent_id}.{node.tool_id}
                        </p>
                        {node.summary && (
                          <p className="text-xs text-slate-600 mt-1">{node.summary}</p>
                        )}
                        {node.trigger_reason && (
                          <p className="text-xs text-slate-500 mt-1 italic">
                            Why: {node.trigger_reason}
                          </p>
                        )}
                      </div>
                      <Badge variant={node.status === 'WILL_EXECUTE' ? 'info' : 'error'}>
                        {node.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Dimensions */}
          {cascadeAction.risk && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Risk Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(cascadeAction.risk.dimensions).map(([dimension, score]) => (
                  <div key={dimension}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600 capitalize">{dimension}</span>
                      <span className="font-medium text-slate-900">{score}/100</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Policy Decision */}
          {cascadeAction.decision && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Policy Decision</h3>
              <div className="p-4 bg-slate-50 rounded-lg">
                {renderDecisionBadge(cascadeAction.decision.decision)}
                {cascadeAction.decision.reasons && cascadeAction.decision.reasons.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {cascadeAction.decision.reasons.map((reason, idx) => (
                      <li key={idx} className="text-sm text-slate-700">
                        <span className="font-medium">{reason.code}:</span> {reason.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Approval Warning */}
          {cascadeAction.decision?.decision === 'APPROVAL_REQUIRED' && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900">Approval Required</p>
                  <p className="text-sm text-yellow-800 mt-1">
                    This action requires manager approval before it can be executed. 
                    The refund has NOT been processed yet.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Blocked Warning */}
          {cascadeAction.decision?.decision === 'BLOCKED' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Action Blocked</p>
                  <p className="text-sm text-red-800 mt-1">
                    Policy prevents this action from being executed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
