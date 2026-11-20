// Shared native request descriptions used by the TUI and SDK transports.
export const APPROVAL_SERVER_REQUEST_METHODS = new Set([
  'item/commandExecution/requestApproval',
  'item/fileChange/requestApproval',
  'item/permissions/requestApproval',
  'applyPatchApproval',
  'execCommandApproval',
]);

export function describeServerRequest(method, params = {}) {
  if (method === 'item/commandExecution/requestApproval') {
    return {
      kind: 'approval',
      name: 'shell_command',
      input: {
        command: params.command,
        cwd: params.cwd,
        reason: params.reason,
        environmentId: params.environmentId,
        approvalId: params.approvalId,
        commandActions: params.commandActions,
        networkApprovalContext: params.networkApprovalContext,
        proposedExecpolicyAmendment: params.proposedExecpolicyAmendment,
        proposedNetworkPolicyAmendments: params.proposedNetworkPolicyAmendments,
      },
    };
  }
  if (method === 'execCommandApproval') {
    return {
      kind: 'approval',
      name: 'shell_command',
      input: {
        command: Array.isArray(params.command) ? params.command.join(' ') : params.command,
        cwd: params.cwd,
        reason: params.reason,
        approvalId: params.approvalId,
        parsedCmd: params.parsedCmd,
      },
    };
  }
  if (method === 'item/fileChange/requestApproval') {
    return {
      kind: 'approval',
      name: 'apply_patch',
      input: {
        reason: params.reason,
        grantRoot: params.grantRoot,
      },
    };
  }
  if (method === 'applyPatchApproval') {
    return {
      kind: 'approval',
      name: 'apply_patch',
      input: {
        fileChanges: params.fileChanges,
        reason: params.reason,
        grantRoot: params.grantRoot,
      },
    };
  }
  if (method === 'item/permissions/requestApproval') {
    return {
      kind: 'approval',
      name: 'permissions',
      input: {
        cwd: params.cwd,
        reason: params.reason,
        permissions: params.permissions,
        environmentId: params.environmentId,
      },
    };
  }
  if (method === 'mcpServer/elicitation/request') {
    return {
      kind: 'elicitation',
      name: params.serverName ? `${params.serverName}.elicitation` : 'mcp.elicitation',
      input: {
        mode: params.mode,
        message: params.message,
        requestedSchema: params.requestedSchema,
        url: params.url,
        elicitationId: params.elicitationId,
        _meta: params._meta,
      },
    };
  }
  if (method === 'item/tool/call') {
    return {
      kind: 'dynamicToolCall',
      name: params.namespace ? `${params.namespace}.${params.tool || 'tool'}` : (params.tool || 'dynamic_tool'),
      input: params.arguments ?? {},
    };
  }
  return null;
}
