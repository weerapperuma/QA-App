import React from 'react';
import { Code2, CheckCircle2, ShieldCheck, EyeOff } from 'lucide-react';
import { ROLES, ROLE_LABELS } from '../utils/roles';

const ROLE_META = {
  [ROLES.DEVELOPER]: { icon: Code2, hint: 'Builds features, fixes defects' },
  [ROLES.QA]: { icon: CheckCircle2, hint: 'Tests, logs defects, verifies' },
  [ROLES.ADMIN]: { icon: ShieldCheck, hint: 'Manages users & settings. Hidden from non-admins' }
};

// Multi-select role chips. `value` is an array of ROLES.
export default function RolePicker({ value = [], onChange, disabled = false }) {
  const toggle = (role) => {
    if (disabled) return;
    const next = value.includes(role) ? value.filter((r) => r !== role) : [...value, role];
    onChange(next);
  };

  return (
    <div className="role-picker">
      {[ROLES.DEVELOPER, ROLES.QA, ROLES.ADMIN].map((role) => {
        const Meta = ROLE_META[role];
        const Icon = Meta.icon;
        const active = value.includes(role);
        return (
          <button
            key={role}
            type="button"
            className={`role-option role-${role.toLowerCase()} ${active ? 'active' : ''}`}
            onClick={() => toggle(role)}
            disabled={disabled}
            aria-pressed={active}
            title={Meta.hint}
          >
            <Icon size={14} />
            <span className="role-option-text">
              <span className="role-option-label">
                {ROLE_LABELS[role]}
                {role === ROLES.ADMIN && <EyeOff size={11} style={{ marginLeft: 4, opacity: 0.7 }} />}
              </span>
              <span className="role-option-hint">{Meta.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
