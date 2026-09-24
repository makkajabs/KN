import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { KNSelect } from "../../../components/KNSelect";
import useDomainEnums from "../../../hooks/useDomainEnums";
import { askReason } from "../../../services/confirmService";
import { ErrorBox, Field, inputCls } from "./GrnBits";
import GrnPhotoPane from "./GrnPhotoPane";
import { errText, grnApi } from "./grnApi";

const EMPTY = { item_code: "", description: "", po_ref: "", qty: "", unit: "", rolls: "", weight_kg: "", weight_basis: "", grade: "", lot: "", target: "", is_non_stock: false };
const tgtKey = (t) => (t ? (t.type === "po_task" ? `po_task:${t.task_id}` : `mko_step:${t.mko_id}:${t.step_seq}`) : "");
const tgtBody = (k) => {
  if (!k) return null;
  const [type, a, b] = k.split(":");
  return type === "po_task" ? { type, task_id: a } : { type, mko_id: a, step_seq: Number(b) };
};
const num = (v) => (v === "" || v == null ? null : Number(v));

function DnForm({ grn, run }) {
  const [dn, setDn] = useState(grn.dn || {});
  useEffect(() => setDn(grn.dn || {}), [grn.dn]);
  const set = (k) => (e) => setDn((d) => ({ ...d, [k]: e.target.value }));
  const save = () => run(() => grnApi.patch(grn.id, "dn", { expected_version: grn.version, number: dn.number || "", date: dn.date || "",
    supplier_name_printed: dn.supplier_name_printed || "", recipient_name: dn.recipient_name || "", vehicle_plate: dn.vehicle_plate || "",
    po_refs: String(dn.po_refs_text ?? (dn.po_refs || []).join(", ")).split(",").map((s) => s.trim()).filter(Boolean) }));
  return (
    <div data-testid="grn-dn-form" className="grid grid-cols-2 gap-2 rounded-xl border border-[#EFF0F2] p-3">
      <Field label="Nomor surat jalan *"><input data-testid="grn-dn-number" className={`${inputCls} font-mono`} value={dn.number || ""} onChange={set("number")} /></Field>
      <Field label="Tanggal kirim"><input data-testid="grn-dn-date" type="date" className={inputCls} value={dn.date || ""} onChange={set("date")} /></Field>
      <Field label="Nama pengirim tercetak"><input data-testid="grn-dn-supplier-printed" className={inputCls} value={dn.supplier_name_printed || ""} onChange={set("supplier_name_printed")} /></Field>
      <Field label="Penerima"><input data-testid="grn-dn-recipient" className={inputCls} value={dn.recipient_name || ""} onChange={set("recipient_name")} /></Field>
      <Field label="Nomor PO di SJ (pisah koma)"><input data-testid="grn-dn-po-refs" className={inputCls} value={dn.po_refs_text ?? (dn.po_refs || []).join(", ")} onChange={set("po_refs_text")} /></Field>
      <Field label="Plat kendaraan"><input data-testid="grn-dn-plate" className={inputCls} value={dn.vehicle_plate || ""} onChange={set("vehicle_plate")} /></Field>
      <div className="col-span-2 flex justify-end">
        <button data-testid="grn-dn-save" className="secondary-button" onClick={save}><Save size={13} /> Simpan kepala SJ</button>
      </div>
    </div>
  );
}

function LineForm({ grn, targets, gradeOptions, run }) {
  const [f, setF] = useState(EMPTY);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e }));
  const add = () => run(async () => {
    const r = await grnApi.post(grn.id, "lines", { expected_version: grn.version, item_code: f.item_code, description: f.description, po_ref: f.po_ref,
      is_non_stock: f.is_non_stock, target: f.is_non_stock ? null : tgtBody(f.target),
      declared: { qty: num(f.qty), unit: f.unit, rolls: num(f.rolls), weight_kg: num(f.weight_kg), weight_basis: f.weight_basis || null, grade: f.grade, lot: f.lot } });
    setF(EMPTY);
    return r;
  });
  const opts = targets.map((t) => ({ value: tgtKey(t), label: t.type === "po_task" ? `${t.po_number} · ${t.product_name} (${t.unit})` : `${t.mko_number} langkah ${t.step_seq} · ${t.product_name}` }));
  return (
    <div data-testid="grn-line-form" className="grid grid-cols-6 gap-2 rounded-xl border border-dashed border-[#CFE0FF] bg-[#F9FBFF] p-3">
      <Field label="Kode"><input data-testid="grn-line-code" className={inputCls} value={f.item_code} onChange={set("item_code")} /></Field>
      <div className="col-span-2"><Field label="Deskripsi"><input data-testid="grn-line-desc" className={inputCls} value={f.description} onChange={set("description")} /></Field></div>
      <Field label="PO di baris"><input data-testid="grn-line-po-ref" className={inputCls} value={f.po_ref} onChange={set("po_ref")} /></Field>
      <Field label="Qty tertulis"><input data-testid="grn-line-qty" type="number" className={`${inputCls} font-mono`} value={f.qty} onChange={set("qty")} /></Field>
      <Field label="Satuan"><input data-testid="grn-line-unit" placeholder="yd / m / kg" className={inputCls} value={f.unit} onChange={set("unit")} /></Field>
      <Field label="Roll"><input data-testid="grn-line-rolls" type="number" className={inputCls} value={f.rolls} onChange={set("rolls")} /></Field>
      <Field label="Kg"><input data-testid="grn-line-kg" type="number" className={inputCls} value={f.weight_kg} onChange={set("weight_kg")} /></Field>
      <Field label="Bruto/Netto">
        <KNSelect data-testid="grn-line-basis" value={f.weight_basis} onValueChange={set("weight_basis")} searchable={false}
          options={[{ value: "net", label: "Netto" }, { value: "gross", label: "Bruto" }, { value: "unknown", label: "Tidak tertulis" }]} placeholder="-" />
      </Field>
      <Field label="Grade"><KNSelect data-testid="grn-line-grade" value={f.grade} onValueChange={set("grade")} options={gradeOptions} placeholder="-" searchable={false} /></Field>
      <Field label="Lot"><input data-testid="grn-line-lot" className={inputCls} value={f.lot} onChange={set("lot")} /></Field>
      <label className="flex items-end gap-1 pb-2 text-[11px] font-semibold"><input data-testid="grn-line-nonstock" type="checkbox" checked={f.is_non_stock} onChange={set("is_non_stock")} /> Non-stok</label>
      <div className="col-span-5"><Field label="Target (tugas PO / langkah MKO)">
        <KNSelect data-testid="grn-line-target" value={f.target} onValueChange={set("target")} options={opts} placeholder={f.is_non_stock ? "Tidak perlu target" : "Pilih target…"} disabled={f.is_non_stock} />
      </Field></div>
      <div className="flex items-end"><button data-testid="grn-line-add" className="primary-button w-full justify-center" onClick={add}><Plus size={13} /> Baris</button></div>
    </div>
  );
}

function LineRow({ grn, ln, targets, run }) {
  const d = ln.declared || {}, uom = ln.checks?.uom;
  const tone = ln.decision === "reject_line" ? "bg-[#F2F2F7] text-[#6B6B73]" : uom === "uom_unknown" || (!ln.target && !ln.is_non_stock) ? "bg-[#FDECEC] text-[#B4231F]" : ln.match?.status === "manual" || ln.match?.status === "exact" ? "bg-[#E7F6F3] text-[#0F766E]" : "bg-[#FFF6E5] text-[#B26A00]";
  const status = ln.decision === "reject_line" ? "Ditolak" : ln.is_non_stock ? "Non-stok" : !ln.target ? "Pilih target" : uom === "uom_unknown" ? "Satuan?" : "Siap";
  const patch = (body) => run(() => grnApi.patch(grn.id, `lines/${ln.line_no}`, { expected_version: grn.version, ...body }));
  return (
    <tr data-testid={`grn-line-row-${ln.line_no}`} className="border-t border-[#EFF0F2] text-[11px]">
      <td className="px-2 py-1.5">{ln.line_no}</td>
      <td className="px-2">{ln.read?.item_code}</td>
      <td className="px-2">{ln.read?.description}</td>
      <td className="px-2 font-mono">{ln.read?.po_ref}</td>
      <td className="px-2 font-mono tabular-nums">{d.qty ?? "-"}</td>
      <td className="px-2">{d.unit}</td>
      <td className="px-2 tabular-nums">{d.rolls ?? "-"}</td>
      <td className="px-2 tabular-nums">{d.weight_kg ?? "-"}{d.weight_basis ? ` (${d.weight_basis === "net" ? "netto" : d.weight_basis === "gross" ? "bruto" : "?"})` : ""}</td>
      <td className="px-2">{d.grade}</td>
      <td className="px-2">{d.lot}</td>
      <td className="px-2">
        <KNSelect data-testid={`grn-line-target-${ln.line_no}`} value={tgtKey(ln.target)} onValueChange={(v) => patch({ target: tgtBody(v) })}
          options={targets.map((t) => ({ value: tgtKey(t), label: t.type === "po_task" ? `${t.po_number} · ${t.product_name}` : `${t.mko_number}/${t.step_seq}` }))} placeholder="-" />
        {ln.converted && <span className="text-[10px] text-[#6B6B73]">= {ln.converted.qty} {ln.converted.unit}</span>}
        {ln.checks?.uom_message && <span className="block text-[10px] text-[#B4231F]">{ln.checks.uom_message}</span>}
      </td>
      <td className="px-2"><span data-testid={`grn-line-status-${ln.line_no}`} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{status}</span></td>
      <td className="whitespace-nowrap px-2">
        <button data-testid={`grn-line-toggle-${ln.line_no}`} className="text-[10.5px] font-semibold text-[#0058CC]"
          onClick={() => patch({ decision: ln.decision === "reject_line" ? "accept" : "reject_line" })}>
          {ln.decision === "reject_line" ? "Terima" : "Tolak"}
        </button>
        <button data-testid={`grn-line-delete-${ln.line_no}`} className="ml-2" aria-label="Hapus baris"
          onClick={() => run(() => grnApi.del(grn.id, `lines/${ln.line_no}`, { expected_version: grn.version }))}><Trash2 size={12} className="text-[#B4231F]" /></button>
      </td>
    </tr>
  );
}

export default function GrnReviewPanel({ grn, onChange, canReview }) {
  const [targets, setTargets] = useState([]);
  const [err, setErr] = useState("");
  const { options } = useDomainEnums();
  const gradeOptions = options("grade");
  useEffect(() => { if (canReview) grnApi.targets(grn.id).then(setTargets).catch(() => setTargets([])); }, [grn.id, canReview]);
  const run = async (fn) => {
    setErr("");
    try { const r = await fn(); onChange(r?.grn || r); } catch (e) { setErr(errText(e)); }
  };
  const reject = async () => {
    const reason = await askReason({ title: "Tolak kedatangan ini?", message: "Barang tidak diterima di pintu gudang.", reasonLabel: "Alasan penolakan", confirmLabel: "Tolak" });
    if (reason) run(() => grnApi.post(grn.id, "reject", { expected_version: grn.version, reason }));
  };
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" data-testid="grn-review-panel">
      <GrnPhotoPane grn={grn} />
      <div className="space-y-3">
        {grn.status === "draft" && (
          <div className="flex items-center justify-between rounded-xl border border-[#FFE3B3] bg-[#FFF9EE] p-3 text-[11px]">
            <span>OCR belum aktif. Isi surat jalan secara manual dari foto.</span>
            <button data-testid="grn-manual-entry" className="primary-button" onClick={() => run(() => grnApi.post(grn.id, "manual-entry", { expected_version: grn.version }))}>Isi manual</button>
          </div>
        )}
        {canReview && <DnForm grn={grn} run={run} />}
        {grn.status === "review" && canReview && (<>
          <div className="overflow-x-auto rounded-xl border border-[#EFF0F2]">
            <table className="w-full text-left" data-testid="grn-lines-table">
              <thead className="bg-[#FAFBFC] text-[10px] font-bold uppercase text-[#6B6B73]">
                <tr>{["No", "Kode", "Deskripsi", "PO", "Tertulis", "Satuan", "Roll", "Kg", "Grade", "Lot", "Target", "Status", ""].map((h) => <th key={h} className="px-2 py-1.5">{h}</th>)}</tr>
              </thead>
              <tbody>{(grn.lines || []).map((ln) => <LineRow key={ln.line_no} grn={grn} ln={ln} targets={targets} run={run} />)}</tbody>
            </table>
            {!(grn.lines || []).length && <p className="p-3 text-[11px] text-[#6B6B73]">Belum ada baris. Salin baris barang dari surat jalan di bawah.</p>}
          </div>
          <LineForm grn={grn} targets={targets} gradeOptions={gradeOptions} run={run} />
          <div className="flex justify-end gap-2">
            <button data-testid="grn-reject" className="secondary-button" onClick={reject}>Tolak kedatangan</button>
            <button data-testid="grn-start-count" className="primary-button" onClick={() => run(() => grnApi.post(grn.id, "start-count", { expected_version: grn.version }))}>Mulai hitung fisik</button>
          </div>
        </>)}
        <ErrorBox text={err} />
      </div>
    </div>
  );
}
