"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller, type Control, type FieldErrors } from "react-hook-form";
import type { AlertCondition, AlertConditionType } from "@/lib/types/alerts";

interface AlertConditionBuilderProps {
  value: AlertCondition | null;
  onChange: (value: AlertCondition) => void;
}

const TYPE_OPTIONS: { value: AlertConditionType; label: string; description: string }[] = [
  { value: "price_above", label: "Harga di atas", description: "Trigger saat harga melebihi nilai" },
  { value: "price_below", label: "Harga di bawah", description: "Trigger saat harga turun di bawah nilai" },
  {
    value: "pct_change",
    label: "Persentase perubahan",
    description: "Trigger saat perubahan harga mencapai persentase tertentu",
  },
  { value: "volume_spike", label: "Volume spike", description: "Trigger saat volume jauh di atas rata-rata" },
  { value: "ma_cross", label: "MA Cross", description: "Trigger saat moving average cross (golden/death)" },
  {
    value: "rsi_threshold",
    label: "RSI threshold",
    description: "Trigger saat RSI menembus level tertentu",
  },
];

type FormValues = {
  type: AlertConditionType;
  priceValue?: number;
  pctWindow?: "1d" | "1w" | "1m";
  pctChange?: number;
  pctDirection?: "up" | "down";
  volMultiple?: number;
  volLookback?: number;
  maFast?: number;
  maSlow?: number;
  maDirection?: "golden" | "death";
  rsiPeriod?: number;
  rsiThreshold?: number;
  rsiDirection?: "above" | "below";
};

function buildCondition(v: FormValues): AlertCondition | null {
  switch (v.type) {
    case "price_above":
    case "price_below":
      if (v.priceValue == null || v.priceValue <= 0) return null;
      return { type: v.type, params: { value: v.priceValue } };
    case "pct_change":
      if (!v.pctWindow || v.pctChange == null || !v.pctDirection) return null;
      return {
        type: "pct_change",
        params: { window: v.pctWindow, changePct: v.pctChange, direction: v.pctDirection },
      };
    case "volume_spike":
      if (v.volMultiple == null || v.volLookback == null) return null;
      return {
        type: "volume_spike",
        params: { multiple: v.volMultiple, lookback: v.volLookback },
      };
    case "ma_cross":
      if (v.maFast == null || v.maSlow == null || !v.maDirection) return null;
      return {
        type: "ma_cross",
        params: { fast: v.maFast, slow: v.maSlow, direction: v.maDirection },
      };
    case "rsi_threshold":
      if (v.rsiPeriod == null || v.rsiThreshold == null || !v.rsiDirection) return null;
      return {
        type: "rsi_threshold",
        params: { period: v.rsiPeriod, threshold: v.rsiThreshold, direction: v.rsiDirection },
      };
  }
}

function conditionToFormValues(cond: AlertCondition | null): FormValues {
  if (!cond) return { type: "price_above" };
  switch (cond.type) {
    case "price_above":
    case "price_below":
      return { type: cond.type, priceValue: cond.params.value };
    case "pct_change":
      return {
        type: "pct_change",
        pctWindow: cond.params.window,
        pctChange: cond.params.changePct,
        pctDirection: cond.params.direction,
      };
    case "volume_spike":
      return {
        type: "volume_spike",
        volMultiple: cond.params.multiple,
        volLookback: cond.params.lookback,
      };
    case "ma_cross":
      return {
        type: "ma_cross",
        maFast: cond.params.fast,
        maSlow: cond.params.slow,
        maDirection: cond.params.direction,
      };
    case "rsi_threshold":
      return {
        type: "rsi_threshold",
        rsiPeriod: cond.params.period,
        rsiThreshold: cond.params.threshold,
        rsiDirection: cond.params.direction,
      };
  }
}

export function AlertConditionBuilder({ value, onChange }: AlertConditionBuilderProps) {
  const defaults = useMemo(() => conditionToFormValues(value), [value]);
  const { control, watch } = useForm<FormValues>({ defaultValues: defaults });
  const currentType = watch("type");

  useEffect(() => {
    const sub = watch((v) => {
      const cond = buildCondition(v as FormValues);
      if (cond) onChange(cond);
    });
    return () => sub.unsubscribe();
  }, [watch, onChange]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Tipe kondisi</label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <select
              {...field}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {TYPE_OPTIONS.find((o) => o.value === currentType)?.description ?? ""}
        </p>
      </div>
      {renderFields(currentType, control)}
    </div>
  );
}

function renderFields(type: AlertConditionType, control: Control<FormValues>) {
  switch (type) {
    case "price_above":
    case "price_below":
      return (
        <NumberField control={control} name="priceValue" label="Harga (IDR)" min={1} />
      );
    case "pct_change":
      return (
        <div className="grid grid-cols-3 gap-3">
          <SelectField
            control={control}
            name="pctWindow"
            label="Window"
            options={[
              { value: "1d", label: "1 hari" },
              { value: "1w", label: "1 minggu" },
              { value: "1m", label: "1 bulan" },
            ]}
          />
          <NumberField control={control} name="pctChange" label="% Perubahan" step={0.1} />
          <SelectField
            control={control}
            name="pctDirection"
            label="Arah"
            options={[
              { value: "up", label: "Naik" },
              { value: "down", label: "Turun" },
            ]}
          />
        </div>
      );
    case "volume_spike":
      return (
        <div className="grid grid-cols-2 gap-3">
          <NumberField control={control} name="volMultiple" label="Kelipatan (×)" min={1.1} step={0.1} />
          <NumberField control={control} name="volLookback" label="Lookback (hari)" min={2} />
        </div>
      );
    case "ma_cross":
      return (
        <div className="grid grid-cols-3 gap-3">
          <NumberField control={control} name="maFast" label="MA cepat" min={2} />
          <NumberField control={control} name="maSlow" label="MA lambat" min={3} />
          <SelectField
            control={control}
            name="maDirection"
            label="Arah"
            options={[
              { value: "golden", label: "Golden cross" },
              { value: "death", label: "Death cross" },
            ]}
          />
        </div>
      );
    case "rsi_threshold":
      return (
        <div className="grid grid-cols-3 gap-3">
          <NumberField control={control} name="rsiPeriod" label="Period" min={2} />
          <NumberField control={control} name="rsiThreshold" label="Threshold" min={0} step={1} />
          <SelectField
            control={control}
            name="rsiDirection"
            label="Arah"
            options={[
              { value: "above", label: "Di atas" },
              { value: "below", label: "Di bawah" },
            ]}
          />
        </div>
      );
  }
}

interface NumberFieldProps {
  control: Control<FormValues>;
  name: keyof FormValues;
  label: string;
  min?: number;
  step?: number;
}

function NumberField({ control, name, label, min, step }: NumberFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <input
            type="number"
            value={field.value as number | undefined ?? ""}
            onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
            min={min}
            step={step ?? "any"}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        )}
      />
    </div>
  );
}

interface SelectFieldProps {
  control: Control<FormValues>;
  name: keyof FormValues;
  label: string;
  options: { value: string; label: string }[];
}

function SelectField({ control, name, label, options }: SelectFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <select
            {...field}
            value={(field.value as string | undefined) ?? ""}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Pilih...
            </option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      />
    </div>
  );
}

// referenced but unused (suppress unused warning if any)
export type AlertConditionBuilderErrors = FieldErrors<FormValues>;
