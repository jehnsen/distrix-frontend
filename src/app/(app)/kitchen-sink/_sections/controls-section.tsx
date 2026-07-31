"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

import { formatTin, isCompleteTin } from "@/lib/format";
import { Card } from "@/components/distrix/primitives";
import { Kbd } from "@/components/distrix/kbd";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const VARIANTS = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "subtle",
  "destructive",
  "destructive-outline",
] as const;

export function ControlsSection() {
  const [tin, setTin] = useState("");
  const [terms, setTerms] = useState("30");
  const tinComplete = isCompleteTin(tin);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h3 className="th-label pb-3">Buttons</h3>
        <div className="flex flex-wrap gap-1.5">
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} size="sm">
              {variant}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          <Button size="xs">xs</Button>
          <Button size="sm">sm</Button>
          <Button size="default">default</Button>
          <Button size="lg">lg</Button>
          <Button size="icon-sm" variant="outline" aria-label="Add">
            <Plus />
          </Button>
          <Button size="icon" variant="outline" aria-label="Delete">
            <Trash2 />
          </Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-sm text-ink-muted">
          <Button size="sm">
            <Save size={16} strokeWidth={1.75} />
            Save draft
          </Button>
          <Kbd keys={["⌘", "S"]} />
          <span>save draft</span>
          <Kbd keys={["⌘", "↵"]} />
          <span>save &amp; close</span>
        </div>
      </Card>

      <Card>
        <h3 className="th-label pb-3">Fields</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ks-name">Customer name</Label>
            <Input id="ks-name" placeholder="Registered business name" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ks-tin">TIN</Label>
            <Input
              id="ks-tin"
              value={tin}
              onChange={(event) => setTin(formatTin(event.target.value))}
              placeholder="000-000-000-00000"
              aria-invalid={tin !== "" && !tinComplete}
              aria-describedby="ks-tin-hint"
              className="font-mono"
            />
            <p
              id="ks-tin-hint"
              className={`text-xs ${tin !== "" && !tinComplete ? "text-overdue" : "text-ink-muted"}`}
            >
              {tin !== "" && !tinComplete
                ? "A TIN is 9 digits plus a 5-digit branch code."
                : "9 digits plus branch code."}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ks-terms">Terms</Label>
            <Select
              value={terms}
              onValueChange={(value) => typeof value === "string" && setTerms(value)}
            >
              <SelectTrigger id="ks-terms">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["COD", "7", "15", "30", "45", "60"].map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "COD" ? "Cash on delivery" : `${option} days`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ks-limit">Credit limit</Label>
            <Input id="ks-limit" numeric inputMode="decimal" defaultValue="900,000.00" />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="ks-notes">Delivery notes</Label>
            <Textarea
              id="ks-notes"
              rows={2}
              placeholder="Gate 3, deliveries accepted 6am–11am only."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ks-readonly">Document number</Label>
            <Input id="ks-readonly" readOnly numeric defaultValue="SI-2026-1188" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ks-invalid">Required field</Label>
            <Input id="ks-invalid" aria-invalid defaultValue="" placeholder="Cannot be blank" />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3">
          <label className="flex items-center gap-2 text-base">
            <Checkbox defaultChecked />
            VAT-registered
          </label>
          <label className="flex items-center gap-2 text-base">
            <Checkbox />
            Withhold EWT
          </label>
          <label className="flex items-center gap-2 text-base">
            <Switch defaultChecked />
            Active
          </label>
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <h3 className="th-label pb-3">Tabs</h3>
        <div className="flex flex-wrap items-start gap-8">
          <Tabs defaultValue="a">
            <TabsList>
              <TabsTrigger value="a">Related</TabsTrigger>
              <TabsTrigger value="b">Files</TabsTrigger>
              <TabsTrigger value="c">Activity</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs defaultValue="local">
            <TabsList variant="segmented">
              <TabsTrigger value="local">Local</TabsTrigger>
              <TabsTrigger value="intl">International</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}
