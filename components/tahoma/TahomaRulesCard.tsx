"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, X, Play, Loader2 } from "lucide-react";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { Button, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTahomaDevices, useTahomaRules } from "@/lib/hooks/use-tahoma";
import { METRICS, operatorLabel } from "@/lib/tahoma/metrics";
import { ACTIONS } from "@/components/tahoma/TahomaLogCard.helpers";
import type {
  RuleAction,
  RuleMetric,
  RuleOperator,
  TahomaDevice,
  TahomaRule,
} from "@/lib/tahoma/types";

const OPERATORS: RuleOperator[] = [">", ">=", "<", "<="];

interface FormState {
  name: string;
  deviceURL: string;
  metric: RuleMetric;
  operator: RuleOperator;
  threshold: number;
  action: RuleAction;
  position: number;
  cooldownMin: number;
  enabled: boolean;
}

const emptyForm: FormState = {
  name: "",
  deviceURL: "",
  metric: "windgust_kmh",
  operator: ">",
  threshold: 35,
  action: "close",
  position: 100,
  cooldownMin: 10,
  enabled: true,
};

export function TahomaRulesCard() {
  const { rules, mutate } = useTahomaRules();
  const { devices } = useTahomaDevices();
  const [editing, setEditing] = useState<TahomaRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, deviceURL: devices[0]?.deviceURL ?? "" });
    setCreating(true);
  };

  const startEdit = (rule: TahomaRule) => {
    setCreating(false);
    setForm({
      name: rule.name,
      deviceURL: rule.deviceURL,
      metric: rule.metric,
      operator: rule.operator,
      threshold: rule.threshold,
      action: rule.action,
      position: rule.position ?? 100,
      cooldownMin: rule.cooldownMin,
      enabled: rule.enabled,
    });
    setEditing(rule);
  };

  const cancel = () => {
    setCreating(false);
    setEditing(null);
    setError(null);
  };

  const submit = async () => {
    setError(null);
    if (!form.name.trim() || !form.deviceURL) {
      setError("Naam en apparaat zijn verplicht");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        deviceURL: form.deviceURL,
        metric: form.metric,
        operator: form.operator,
        threshold: form.threshold,
        action: form.action,
        position: ACTIONS.find((a) => a.value === form.action)?.needsPosition
          ? form.position
          : undefined,
        cooldownMin: form.cooldownMin,
        enabled: form.enabled,
      };
      const res = editing
        ? await fetch(`/api/tahoma/rules/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/tahoma/rules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `Fout ${res.status}`);
      }
      await mutate();
      cancel();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (rule: TahomaRule) => {
    await fetch(`/api/tahoma/rules/${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    await mutate();
  };

  const remove = async (rule: TahomaRule) => {
    await fetch(`/api/tahoma/rules/${rule.id}`, { method: "DELETE" });
    if (editing?.id === rule.id) cancel();
    await mutate();
  };

  return (
    <Surface level="raised">
      <SurfaceBody className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Regels</h3>
            <p className="text-caption mt-0.5 text-surface-muted">
              Ecowitt-weer → Tahoma-actie
            </p>
          </div>
          <Button size="sm" onClick={startCreate} disabled={creating}>
            <Plus className="h-4 w-4" />
            Nieuwe regel
          </Button>
        </div>

        {creating || editing ? (
          <RuleEditor
            form={form}
            setForm={setForm}
            devices={devices}
            saving={saving}
            error={error}
            editing={!!editing}
            onSubmit={submit}
            onCancel={cancel}
          />
        ) : null}

        {rules.length === 0 && !creating ? (
          <p className="text-caption text-surface-muted">
            Nog geen regels. Maak er één aan, bijv. «zonnescherm dicht bij windstoot &gt; 35 km/u».
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                device={devices.find((d) => d.deviceURL === rule.deviceURL)}
                onToggle={() => toggle(rule)}
                onEdit={() => startEdit(rule)}
                onDelete={() => remove(rule)}
              />
            ))}
          </ul>
        )}
      </SurfaceBody>
    </Surface>
  );
}

function RuleEditor({
  form,
  setForm,
  devices,
  saving,
  error,
  editing,
  onSubmit,
  onCancel,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  devices: TahomaDevice[];
  saving: boolean;
  error: string | null;
  editing: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const needsPosition = ACTIONS.find((a) => a.value === form.action)?.needsPosition ?? false;
  const metricMeta = METRICS.find((m) => m.key === form.metric);

  return (
    <div className="space-y-3 rounded-[var(--radius-sm)] border border-border-subtle bg-surface p-3">
      <div className="flex items-center justify-between">
        <p className="text-label font-semibold text-foreground">
          {editing ? "Regel bewerken" : "Nieuwe regel"}
        </p>
        <IconButton onClick={onCancel} aria-label="Annuleren">
          <X className="h-4 w-4" />
        </IconButton>
      </div>

      <label className="block space-y-1">
        <span className="text-label text-surface-muted">Naam</span>
        <input
          className="tahoma-input"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Bijv. Zonnescherm dicht bij harde wind"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-label text-surface-muted">Apparaat</span>
        <select
          className="tahoma-input"
          value={form.deviceURL}
          onChange={(e) => setForm((f) => ({ ...f, deviceURL: e.target.value }))}
        >
          {devices.length === 0 ? <option value="">geen apparaten</option> : null}
          {devices.map((d) => (
            <option key={d.deviceURL} value={d.deviceURL}>
              {d.label} · {d.uiClass}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-label text-surface-muted">Meting</span>
          <select
            className="tahoma-input"
            value={form.metric}
            onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value as RuleMetric }))}
          >
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} {m.unit ? `(${m.unit})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-label text-surface-muted">Operator</span>
          <select
            className="tahoma-input"
            value={form.operator}
            onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value as RuleOperator }))}
          >
            {OPERATORS.map((o) => (
              <option key={o} value={o}>
                {o} ({operatorLabel(o)})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-label text-surface-muted">Drempel</span>
          <input
            type="number"
            className="tahoma-input"
            value={form.threshold}
            onChange={(e) => setForm((f) => ({ ...f, threshold: Number(e.target.value) }))}
          />
          {metricMeta?.hint ? (
            <span className="block text-caption text-surface-muted">{metricMeta.hint}</span>
          ) : null}
        </label>
        <label className="block space-y-1">
          <span className="text-label text-surface-muted">Actie</span>
          <select
            className="tahoma-input"
            value={form.action}
            onChange={(e) => setForm((f) => ({ ...f, action: e.target.value as RuleAction }))}
          >
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {needsPosition ? (
        <label className="block space-y-1">
          <span className="text-label text-surface-muted">
            {form.action === "setClosure" ? "Stand (% gesloten)" : "Orientatie (°)"}
          </span>
          <input
            type="number"
            className="tahoma-input w-32"
            value={form.position}
            onChange={(e) => setForm((f) => ({ ...f, position: Number(e.target.value) }))}
          />
        </label>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-label text-surface-muted">Cooldown (min)</span>
          <input
            type="number"
            className="tahoma-input w-32"
            value={form.cooldownMin}
            onChange={(e) => setForm((f) => ({ ...f, cooldownMin: Number(e.target.value) }))}
          />
        </label>
        <label className="flex items-center gap-2 self-end pb-2">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          <span className="text-sm text-foreground">Ingeschakeld</span>
        </label>
      </div>

      {error ? <p className="text-caption text-accent-danger">{error}</p> : null}

      <div className="flex gap-2">
        <Button onClick={onSubmit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {editing ? "Opslaan" : "Aanmaken"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Annuleren
        </Button>
      </div>
    </div>
  );
}

function RuleRow({
  rule,
  device,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: TahomaRule;
  device?: TahomaDevice;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const metricMeta = METRICS.find((m) => m.key === rule.metric);
  const actionLabel = ACTIONS.find((a) => a.value === rule.action)?.label ?? rule.action;
  const deviceName = device?.label ?? rule.deviceURL;

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{rule.name}</p>
          <p className="text-caption mt-0.5 text-surface-muted">
            {metricMeta?.label ?? rule.metric} {rule.operator} {rule.threshold}
            {metricMeta?.unit ? ` ${metricMeta.unit}` : ""} → {actionLabel}
            {rule.action === "setClosure" && rule.position != null ? ` (${rule.position}%)` : ""}
          </p>
          <p className="text-caption mt-0.5 text-surface-muted">
            {deviceName} · cooldown {rule.cooldownMin} min
            {rule.lastTriggeredAt
              ? ` · laatste ${new Date(rule.lastTriggeredAt).toLocaleString("nl-NL", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                })}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant={rule.enabled ? "export" : "default"}>
            {rule.enabled ? "aan" : "uit"}
          </Badge>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onToggle}>
          {rule.enabled ? "Uitschakelen" : "Inschakelen"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Bewerken
        </Button>
        <IconButton variant="ghost" onClick={onDelete} aria-label="Verwijderen">
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </li>
  );
}

/** Handmatige evaluatie-knop ("Test nu") — los componentje. */
export function TahomaEvaluateButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/tahoma/evaluate", { method: "POST" });
      const b = (await res.json().catch(() => ({}))) as {
        evaluated?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(b.error ?? `Fout ${res.status}`);
      setResult(b.evaluated != null ? `${b.evaluated} regel(s) geëvalueerd` : "Klaar");
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Mislukt");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={run} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Test nu
      </Button>
      {result ? <span className="text-caption text-surface-muted">{result}</span> : null}
    </div>
  );
}
