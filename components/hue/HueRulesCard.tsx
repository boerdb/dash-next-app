"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, X, Play, Loader2, Power } from "lucide-react";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { Button, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHueLights, useHueRules, useHueSettings } from "@/lib/hooks/use-hue";
import { METRICS, operatorLabel } from "@/lib/tahoma/metrics";
import { HUE_ACTIONS } from "@/components/hue/HueRulesCard.helpers";
import { HueColorSelect } from "@/components/hue/HueColorSelect";
import { colorLabel, type HueColorPreset } from "@/lib/hue/colors";
import type { HueLight, HueRule, HueRuleAction } from "@/lib/hue/types";
import type { RuleMetric, RuleOperator } from "@/lib/tahoma/types";

const OPERATORS: RuleOperator[] = [">", ">=", "<", "<="];

interface FormState {
  name: string;
  lightId: string;
  metric: RuleMetric;
  operator: RuleOperator;
  threshold: number;
  action: HueRuleAction;
  brightness: number;
  color: HueColorPreset | "";
  resetAfterMin: number;
  cooldownMin: number;
  enabled: boolean;
}

const emptyForm: FormState = {
  name: "",
  lightId: "",
  metric: "illuminance_lux",
  operator: "<",
  threshold: 30,
  action: "on",
  brightness: 50,
  color: "",
  resetAfterMin: 5,
  cooldownMin: 10,
  enabled: true,
};

export function HueRulesCard() {
  const { rules, mutate } = useHueRules();
  const { lights } = useHueLights();
  const { settings, mutate: mutateSettings } = useHueSettings();
  const [editing, setEditing] = useState<HueRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, lightId: lights[0]?.id ?? "" });
    setCreating(true);
  };

  const startEdit = (rule: HueRule) => {
    setCreating(false);
    setForm({
      name: rule.name,
      lightId: rule.lightId,
      metric: rule.metric,
      operator: rule.operator,
      threshold: rule.threshold,
      action: rule.action,
      brightness: rule.brightness ?? 50,
      color: rule.color ?? "",
      resetAfterMin: rule.resetAfterMin ?? 0,
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

  const toggleAutomation = async () => {
    if (!settings?.configured) return;
    setSaving(true);
    try {
      const res = await fetch("/api/hue/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !settings.enabled }),
      });
      if (!res.ok) throw new Error("Wisselen mislukt");
      await mutateSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wisselen mislukt");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (!form.name.trim() || !form.lightId) {
      setError("Naam en lamp zijn verplicht");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        lightId: form.lightId,
        metric: form.metric,
        operator: form.operator,
        threshold: form.threshold,
        action: form.action,
        brightness: HUE_ACTIONS.find((a) => a.value === form.action)?.needsBrightness
          ? form.brightness
          : undefined,
        color:
          form.color && form.action !== "off" ? form.color : undefined,
        resetAfterMin: form.resetAfterMin,
        cooldownMin: form.cooldownMin,
        enabled: form.enabled,
      };
      const res = editing
        ? await fetch(`/api/hue/rules/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/hue/rules", {
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

  const toggle = async (rule: HueRule) => {
    await fetch(`/api/hue/rules/${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    await mutate();
  };

  const remove = async (rule: HueRule) => {
    await fetch(`/api/hue/rules/${rule.id}`, { method: "DELETE" });
    if (editing?.id === rule.id) cancel();
    await mutate();
  };

  return (
    <Surface level="raised">
      <SurfaceBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Regels</h3>
            <p className="text-caption mt-0.5 text-surface-muted">
              Weer → lamp (lux, onweer, wind, …)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAutomation}
              disabled={saving || !settings?.configured}
            >
              <Power className="h-4 w-4" />
              {settings?.enabled ? "Automatisering uit" : "Automatisering aan"}
            </Button>
            <Button size="sm" onClick={startCreate} disabled={creating}>
              <Plus className="h-4 w-4" />
              Nieuwe regel
            </Button>
          </div>
        </div>

        {settings?.configured ? (
          <Badge variant={settings.enabled ? "amber" : "default"}>
            {settings.enabled ? "automatisering actief" : "automatisering uit"}
          </Badge>
        ) : null}

        {creating || editing ? (
          <RuleEditor
            form={form}
            setForm={setForm}
            lights={lights}
            saving={saving}
            error={error}
            editing={!!editing}
            onSubmit={submit}
            onCancel={cancel}
          />
        ) : null}

        {rules.length === 0 && !creating ? (
          <p className="text-caption text-surface-muted">
            Nog geen regels. Bijv. «ganglamp aan als lux &lt; 30» of «lamp aan bij onweerrisico».
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                light={lights.find((l) => l.id === rule.lightId)}
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
  lights,
  saving,
  error,
  editing,
  onSubmit,
  onCancel,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  lights: HueLight[];
  saving: boolean;
  error: string | null;
  editing: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const needsBrightness =
    HUE_ACTIONS.find((a) => a.value === form.action)?.needsBrightness ?? false;
  const metricMeta = METRICS.find((m) => m.key === form.metric);
  const selectedLight = lights.find((l) => l.id === form.lightId);

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
          placeholder="Bijv. Ganglamp bij weinig licht"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-label text-surface-muted">Lamp</span>
        <select
          className="tahoma-input"
          value={form.lightId}
          onChange={(e) => setForm((f) => ({ ...f, lightId: e.target.value }))}
        >
          {lights.length === 0 ? <option value="">geen lampen</option> : null}
          {lights.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
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
            onChange={(e) => setForm((f) => ({ ...f, action: e.target.value as HueRuleAction }))}
          >
            {HUE_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {needsBrightness ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-label text-surface-muted">Helderheid (%)</span>
            <input
              type="number"
              min={1}
              max={100}
              className="tahoma-input w-32"
              value={form.brightness}
              onChange={(e) => setForm((f) => ({ ...f, brightness: Number(e.target.value) }))}
            />
          </label>
          {selectedLight ? (
            <label className="block space-y-1">
              <span className="text-label text-surface-muted">Kleur</span>
              <HueColorSelect
                value={form.color}
                onChange={(color) => setForm((f) => ({ ...f, color }))}
                capabilities={selectedLight.capabilities}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-label text-surface-muted">Herstel na (min)</span>
          <input
            type="number"
            min={0}
            className="tahoma-input w-32"
            value={form.resetAfterMin}
            onChange={(e) => setForm((f) => ({ ...f, resetAfterMin: Number(e.target.value) }))}
          />
          <span className="block text-caption text-surface-muted">
            0 = uit · anders terug naar staat vóór alarm
          </span>
        </label>
        <label className="block space-y-1">
          <span className="text-label text-surface-muted">Cooldown (min)</span>
          <input
            type="number"
            className="tahoma-input w-32"
            value={form.cooldownMin}
            onChange={(e) => setForm((f) => ({ ...f, cooldownMin: Number(e.target.value) }))}
          />
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
          className="h-4 w-4 accent-[var(--primary)]"
        />
        <span className="text-sm text-foreground">Ingeschakeld</span>
      </label>

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
  light,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: HueRule;
  light?: HueLight;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const metricMeta = METRICS.find((m) => m.key === rule.metric);
  const actionLabel = HUE_ACTIONS.find((a) => a.value === rule.action)?.label ?? rule.action;
  const lightName = light?.name ?? `Lamp ${rule.lightId}`;

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{rule.name}</p>
          <p className="text-caption mt-0.5 text-surface-muted">
            {metricMeta?.label ?? rule.metric} {rule.operator} {rule.threshold}
            {metricMeta?.unit ? ` ${metricMeta.unit}` : ""} → {actionLabel}
            {rule.brightness != null && rule.action !== "off" ? ` (${rule.brightness}%)` : ""}
            {rule.color && rule.action !== "off" ? ` · ${colorLabel(rule.color)}` : ""}
          </p>
          <p className="text-caption mt-0.5 text-surface-muted">
            {lightName}
            {rule.resetAfterMin ? ` · herstel na ${rule.resetAfterMin} min` : ""}
            {" · "}cooldown {rule.cooldownMin} min
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
        <Badge variant={rule.enabled ? "amber" : "default"}>
          {rule.enabled ? "aan" : "uit"}
        </Badge>
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

export function HueEvaluateButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/hue/evaluate", { method: "POST" });
      const b = (await res.json().catch(() => ({}))) as {
        evaluated?: number;
        triggered?: number;
        results?: { triggered: boolean; message?: string; ruleName?: string }[];
        error?: string;
      };
      if (!res.ok) throw new Error(b.error ?? `Fout ${res.status}`);

      const checked = b.evaluated ?? 0;
      const triggered = b.triggered ?? 0;
      if (checked === 0) {
        setResult("Geen actieve regels");
        return;
      }
      if (triggered === 0) {
        const detail = b.results?.find((r) => !r.triggered && r.message)?.message;
        setResult(
          detail
            ? `${checked} gecontroleerd · geen trigger (${detail})`
            : `${checked} gecontroleerd · geen trigger`,
        );
        return;
      }
      setResult(`${checked} gecontroleerd · ${triggered} geactiveerd`);
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
