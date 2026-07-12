import React from 'react';
import DiffView from './DiffView';
import { getToolPatchOperations } from '../../utils/applyPatchParser.js';

const LABELS = {
  add: 'Add:',
  delete: 'Delete:',
  update: 'Update:',
};

export default function ApplyPatchView({ toolUse, operations: suppliedOperations, onOpenFile }) {
  const operations = suppliedOperations || getToolPatchOperations(toolUse?.name, toolUse?.input);
  if (operations.length === 0) return null;
  return (
    <div key={toolUse.id}>
      {operations.map((operation, index) => {
        const isMoveOnly = operation.moveTo && operation.added === 0 && operation.removed === 0;
        const displayPath = operation.moveTo
          ? `${operation.path} → ${operation.moveTo}`
          : operation.path;
        return (
          <DiffView
            key={`${toolUse.id}-${index}-${operation.path}`}
            label={operation.moveTo ? 'Move:' : LABELS[operation.type]}
            file_path={displayPath}
            open_file_path={operation.moveTo || operation.path}
            old_string={operation.oldString}
            new_string={operation.newString}
            startLine={operation.startLine}
            summaryLabel={operation.type === 'delete' && operation.removed === 0
              ? 'deleted'
              : (isMoveOnly ? 'moved' : null)}
            onOpenFile={onOpenFile}
          />
        );
      })}
    </div>
  );
}
