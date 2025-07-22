import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Stack, Select, InputLabel, FormControl, Checkbox, ListItemText, OutlinedInput, FormHelperText, Box, Divider, Typography, Paper
} from "@mui/material";
import EventIcon from "@mui/icons-material/Event";
import PeopleIcon from "@mui/icons-material/People";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import { supabase } from "../lib/supabase";

// --- 基本金額計算 ---
function getBasePrice(course, shimei, op, courseOptions, shimeiOptions, opOptions) {
  const c = courseOptions.find(opt => opt.name === course || String(opt.id) === String(course));
  const s = shimeiOptions.find(opt => opt.name === shimei || String(opt.id) === String(shimei));
  const ops = Array.isArray(op)
    ? op.map(o => {
      const found = opOptions.find(opt => String(opt.id) === String(o) || opt.name === o);
      return found?.price || 0;
    })
    : [];
  return (Number(c?.price || 0) + Number(s?.price || 0) + ops.reduce((sum, n) => sum + Number(n), 0));
}

// --- 割引金額取得 ---
function getDiscountAmount(discounts, discountOptions) {
  if (!discounts) return 0;
  if (!Array.isArray(discounts)) discounts = [discounts];
  return discounts.reduce((sum, d) => {
    const found = discountOptions.find(opt => opt.code === d);
    return sum + Number(found?.amount || 0);
  }, 0);
}

// --- 女子給計算（コース・指名種類・OP・割引対応） ---
function getCastPay(course, shimei, op, discount, courseOptions, shimeiOptions, opOptions, discountOptions) {
  // コース女子給
  const c = courseOptions.find(opt => opt.name === course || String(opt.id) === String(course));
  let basePay = Number(c?.cast_pay || 0);

  // 指名女子給
  const s = shimeiOptions.find(opt => opt.name === shimei || String(opt.id) === String(shimei));
  basePay += Number(s?.cast_pay || 0);

  // OP女子給合計
  if (Array.isArray(op)) {
    basePay += op.reduce((sum, o) => {
      const found = opOptions.find(opt => String(opt.id) === String(o) || opt.name === o);
      return sum + Number(found?.cast_pay || 0);
    }, 0);
  }

  // 割引delta
  let delta = 0;
  if (discount) {
    if (Array.isArray(discount)) {
      delta = discount
        .map(dcode => discountOptions.find(opt => opt.code === dcode)?.cast_pay_delta || 0)
        .reduce((sum, v) => sum + Number(v), 0);
    } else {
      const d = discountOptions.find(opt => opt.code === discount);
      delta = Number(d?.cast_pay_delta || 0);
    }
  }
  return basePay + delta;
}

const paymentOptions = [
  { value: "cash", label: "現金" },
  { value: "card", label: "カード" },
  { value: "paypay", label: "PayPay" }
];

function addMinutesToTime(datetime, minutes) {
  if (!datetime || !minutes) return "";
  const dt = new Date(datetime);
  dt.setMinutes(dt.getMinutes() + minutes);
  return dt.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
}

export default function UsageHistoryDialog({
  open, mode = "create", initialData = {}, onSave, onClose,
  courseOptions = [], shimeiOptions = [],
  opOptions = [], discountOptions = [],
  historyList = [],
  castOptions = [],
  onDateChange
}) {
  const [form, setForm] = useState({ ...initialData });

  function sortDiscounts(arr) {
    // SPA割→サイコロ→Web/個人など
    return [...arr].sort((a, b) => {
      // グループ分け
      const group = (label) => {
        if (label.startsWith("SPA割")) return 0;
        if (label.startsWith("サイコロ")) return 1;
        return 2;
      };
      const aGroup = group(a.code);
      const bGroup = group(b.code);
      if (aGroup !== bGroup) return aGroup - bGroup;

      // SPA割・サイコロなら数字順
      if (aGroup === 0 || aGroup === 1) {
        // 数字抽出
        const numA = Number((a.code.match(/\d+(\.\d+)?/) || [])[0] || 0);
        const numB = Number((b.code.match(/\d+(\.\d+)?/) || [])[0] || 0);
        return numA - numB;
      }

      // それ以外は五十音順
      return a.code.localeCompare(b.code, "ja");
    });
  }

  // --- コースの並び順カスタム ---
  const normalCourses = courseOptions.filter(c => /^\d+分$/.test(c.name)).sort(
    (a, b) => parseInt(a.name) - parseInt(b.name)
  );
  const extCourses = courseOptions.filter(c => c.name.startsWith("延長")).sort(
    (a, b) => parseInt(a.name.replace(/[^\d]/g, "")) - parseInt(b.name.replace(/[^\d]/g, ""))
  );
  const specialCourses = courseOptions.filter(
    c => !/^\d+分$/.test(c.name) && !c.name.startsWith("延長")
  ).sort(
    (a, b) => parseInt(a.name.replace(/[^\d]/g, "")) - parseInt(b.name.replace(/[^\d]/g, ""))
  );

  const sortedCourses = [...normalCourses, ...extCourses, ...specialCourses];

  const [errors, setErrors] = useState({});
  const [endTime, setEndTime] = useState(""); // 終了時刻

  // --- 調整欄のstate ---
  const [priceAdjust, setPriceAdjust] = useState("");
  const [castPayAdjust, setCastPayAdjust] = useState("");

  const datePart = form.datetime ? form.datetime.slice(0, 10) : "";
  const timePart = form.datetime ? form.datetime.slice(11, 16) : "";

  useEffect(() => {
    setForm({
      ...initialData,
      op: (() => {
        if (!initialData.op) return [];
        if (Array.isArray(initialData.op)) return initialData.op;
        try {
          // 文字列→配列
          if (typeof initialData.op === "string" && initialData.op.startsWith("[")) {
            return JSON.parse(initialData.op);
          }
        } catch { /* 無視 */ }
        return [];
      })(),
      discount: (() => {
        if (!initialData.discount) return [];
        if (Array.isArray(initialData.discount)) return initialData.discount;
        try {
          if (typeof initialData.discount === "string" && initialData.discount.startsWith("[")) {
            return JSON.parse(initialData.discount);
          }
        } catch { /* 無視 */ }
        // 単一値なら配列化
        return [initialData.discount];
      })(),
    });
    setPriceAdjust(initialData.price_adjust !== undefined ? String(initialData.price_adjust) : "");
    setCastPayAdjust(initialData.cast_pay_adjust !== undefined ? String(initialData.cast_pay_adjust) : "");
  }, [initialData, open]);

  // 金額自動計算
  const basePrice = getBasePrice(form.course, form.shimei, form.op, courseOptions, shimeiOptions, opOptions);
  const discountAmount = getDiscountAmount(form.discount, discountOptions);
  const finalPrice = Math.max(0, basePrice - discountAmount);

  // 女子給（全項目対応）
  const castPay = getCastPay(
    form.course,
    form.shimei,
    form.op,
    form.discount,
    courseOptions,
    shimeiOptions,
    opOptions,
    discountOptions
  );

  // --- 調整反映後の金額 ---
  const adjustedPrice = finalPrice + (Number(priceAdjust) || 0);
  const adjustedCastPay = castPay + (Number(castPayAdjust) || 0);

  // コース・指名・OP・割引選択時：女子給・終了時刻等を自動反映
  useEffect(() => {
    if (form.course && datePart && timePart) {
      const c = courseOptions.find(opt => opt.name === form.course || String(opt.id) === String(form.course));
      const duration = Number(c?.duration || 0);
      const startDatetime = datePart + "T" + timePart;
      let calcEnd = "";
      if (duration) {
        const dt = new Date(startDatetime);
        dt.setMinutes(dt.getMinutes() + duration);
        calcEnd = dt.toTimeString().slice(0, 5);
      }
      setForm(f => ({
        ...f,
        cast_pay: getCastPay(
          form.course,
          form.shimei,
          form.op,
          form.discount,
          courseOptions,
          shimeiOptions,
          opOptions,
          discountOptions
        ),
        duration: duration,
        end_time: calcEnd
      }));
      setEndTime(calcEnd);
    }
    // eslint-disable-next-line
  }, [form.course, form.shimei, form.op, form.discount, datePart, timePart, courseOptions, shimeiOptions, opOptions, discountOptions]);

  // 開始時刻やコース変更時にも再計算（終了時刻のみ）
  useEffect(() => {
    if (form.course && datePart && timePart) {
      const c = courseOptions.find(opt => opt.name === form.course || String(opt.id) === String(form.course));
      const duration = Number(c?.duration || 0);
      const startDatetime = datePart + "T" + timePart;
      let calcEnd = "";
      if (duration) {
        const dt = new Date(startDatetime);
        dt.setMinutes(dt.getMinutes() + duration);
        calcEnd = dt.toTimeString().slice(0, 5);
      }
      setForm(f => ({
        ...f,
        end_time: calcEnd
      }));
      setEndTime(calcEnd);
    }
    // eslint-disable-next-line
  }, [datePart, timePart]);

  // 入力変更時
  const handleChange = e => {
    const { name, value } = e.target;
    let newForm = { ...form };
    if (name === "date") {
      newForm.datetime = value + (timePart ? `T${timePart}` : "T12:00");
      if (onDateChange) onDateChange(newForm.datetime);
    } else if (name === "time") {
      newForm.datetime = (datePart || "2025-07-01") + "T" + value;
    } else if (name === "op") {
      newForm[name] = Array.isArray(value) ? value : (typeof value === "string" ? value.split(",") : value);
    } else if (name === "discount") {
      newForm[name] = Array.isArray(value) ? value : (typeof value === "string" ? value.split(",") : value);
    } else {
      newForm[name] = value;
    }
    if (name === "shimei") {
      const shimeiObj = shimeiOptions.find(opt => opt.name === value || String(opt.id) === String(value));
      newForm.shimei_fee = Number(shimeiObj?.price || 0);
    }
    // コース・指名・OP・割引変更時に女子給再計算
    if (["course", "shimei", "op", "discount"].includes(name)) {
      newForm.cast_pay = getCastPay(
        name === "course" ? value : newForm.course,
        name === "shimei" ? value : newForm.shimei,
        name === "op" ? value : newForm.op,
        name === "discount" ? value : newForm.discount,
        courseOptions,
        shimeiOptions,
        opOptions,
        discountOptions
      );
    }
    // 金額も再計算
    if (
      name === "course" || name === "shimei" || name === "op" || name === "discount"
    ) {
      newForm.price =
        Math.max(
          0,
          (
            name === "course"
              ? getBasePrice(value, newForm.shimei, newForm.op, courseOptions, shimeiOptions, opOptions)
              : name === "shimei"
                ? getBasePrice(newForm.course, value, newForm.op, courseOptions, shimeiOptions, opOptions)
                : name === "op"
                  ? getBasePrice(newForm.course, newForm.shimei, value, courseOptions, shimeiOptions, opOptions)
                  : getBasePrice(newForm.course, newForm.shimei, newForm.op, courseOptions, shimeiOptions, opOptions)
          ) - (name === "discount" ? getDiscountAmount(value, discountOptions) : discountAmount)
        );
    }
    setForm(newForm);
  };

  // 保存
  const handleSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const newErrors = {};
    if (!datePart) newErrors.datetime = "日付は必須";
    if (!timePart) newErrors.datetime = "時間は必須";
    if (!form.kubun) newErrors.kubun = "区分は必須";
    if (!form.cast_id) newErrors.cast_id = "担当キャストは必須";
    if (!form.course) newErrors.course = "コースは必須";
    if (!form.shimei) newErrors.shimei = "指名は必須";
    if (!form.payment_method) newErrors.payment_method = "支払方法は必須";
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    const toTimeString = (str) => {
      if (!str) return null;
      if (str.length === 5) return str + ":00";
      if (str.length === 8) return str;
      return null;
    };

    const _start = toTimeString(timePart);
    const _end = toTimeString(endTime);

    // OP詳細
    const opDetail = Array.isArray(form.op)
      ? form.op.map(opName => {
        const opt = opOptions.find(opt => opt.name === opName);
        return {
          name: opName,
          price: Number(opt?.price || 0),
          cast_pay: Number(opt?.cast_pay || 0),
        };
      })
      : [];

    // 割引詳細
    // --- 割引詳細
    const discountDetail = Array.isArray(form.discount)
      ? form.discount.map(dcode => {
        const d = discountOptions.find(opt => opt.code === dcode);
        return d
          ? {
            code: d.code,
            amount: Number(d.amount || 0),
            cast_pay_delta: Number(d.cast_pay_delta || 0),
            name: d.label || d.code,
          }
          : null;
      }).filter(Boolean)
      : [];

    const discountAmount = discountDetail.reduce((sum, d) => sum + (d.amount || 0), 0);


    // コース金額（コース本体のみ）
    const courseObj = courseOptions.find(opt => opt.name === form.course || String(opt.id) === String(form.course));
    const course_price = Number(courseObj?.price || 0);

    // --- 送信データ ---
    const sendData = {
      ...form,
      op: form.op || [],
      shimei_fee: form.shimei_fee || 0,
      price: adjustedPrice,
      cast_pay: adjustedCastPay,
      start_time: _start,
      end_time: _end,
      duration: form.duration || 0,
      op_price: opDetail.reduce((sum, o) => sum + o.price, 0),
      op_detail: opDetail,
      discount_amount: discountAmount, // ←こっちで合算値を明示的に
      discount_detail: discountDetail,
      discount: Array.isArray(form.discount) ? form.discount : [form.discount],
      course_price,
      price_adjust: Number(priceAdjust) || 0,
      cast_pay_adjust: Number(castPayAdjust) || 0,
    };

    if (onSave) onSave(sendData);
  };

  // 削除
  const handleDelete = async () => {
    if (!initialData?.id) return;
    if (!window.confirm("本当に削除しますか？")) return;
    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", initialData.id);
    if (error) {
      alert("削除に失敗しました: " + error.message);
      return;
    }
    if (onClose) onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900, letterSpacing: 1.1, fontSize: 22, px: 3, py: 2 }}>
        {mode === "edit" ? "利用履歴の編集" : "利用履歴の作成"}
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: "#f6f8fc", px: 3, pb: 1.5 }}>
        <Paper elevation={4} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, mb: 2, boxShadow: "0 2px 14px #94a3b820" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
            <Stack spacing={2} sx={{ flex: 1 }}>
              <Box display="flex" alignItems="center" gap={1.1}>
                <EventIcon sx={{ color: "#6b7280", fontSize: 22 }} />
                <TextField
                  label="日付 *"
                  name="date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={datePart}
                  onChange={handleChange}
                  required
                  error={!!errors.datetime}
                  helperText={!!errors.datetime && !timePart ? "日付を選択してください" : ""}
                  size="small"
                  sx={{ minWidth: 180, maxWidth: 250 }}
                  fullWidth
                />
                <TextField
                  label="時間 *"
                  name="time"
                  type="time"
                  InputLabelProps={{ shrink: true }}
                  value={timePart}
                  onChange={handleChange}
                  required
                  error={!!errors.datetime}
                  helperText={!!errors.datetime && !datePart ? "時間を選択してください" : ""}
                  size="small"
                  fullWidth
                />
              </Box>
              <TextField
                select
                label="区分 **"
                name="kubun"
                value={form.kubun || ""}
                onChange={handleChange}
                required
                error={!!errors.kubun}
                helperText={errors.kubun}
                size="small"
                fullWidth
              >
                <MenuItem value="">（選択してください）</MenuItem>
                <MenuItem value="予約">予約</MenuItem>
                <MenuItem value="成約">成約</MenuItem>
                <MenuItem value="キャンセル">キャンセル</MenuItem>
              </TextField>
              <FormControl fullWidth required error={!!errors.cast_id}>
                <InputLabel>キャスト *</InputLabel>
                <Select
                  name="cast_id"
                  label="キャスト *"
                  value={form.cast_id || ""}
                  onChange={handleChange}
                  renderValue={selected => {
                    const cast = castOptions.find(opt => opt.id === selected);
                    return cast ? `${cast.name}（${cast.count}回）` : "";
                  }}
                  size="small"
                >
                  <MenuItem value="">（選択してください）</MenuItem>
                  {castOptions.length === 0 && (
                    <MenuItem disabled>（出勤キャストなし）</MenuItem>
                  )}
                  {castOptions.map(opt => (
                    <MenuItem value={opt.id} key={opt.id}>
                      <PeopleIcon fontSize="small" sx={{ mr: 0.5 }} />
                      {opt.name}（{opt.count}回）
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{errors.cast_id}</FormHelperText>
              </FormControl>
            </Stack>
            <Stack spacing={2} sx={{ flex: 1 }}>
              <TextField
                select
                label="コース"
                name="course"
                value={form.course || ""}
                onChange={handleChange}
                fullWidth
                required
                error={!!errors.course}
                helperText={errors.course}
                size="small"
              >
                <MenuItem value="">（選択してください）</MenuItem>
                {sortedCourses.map(opt => (
                  <MenuItem value={opt.name} key={opt.id}>
                    {opt.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="指名"
                name="shimei"
                value={form.shimei || ""}
                onChange={handleChange}
                fullWidth
                required
                error={!!errors.shimei}
                helperText={errors.shimei}
                size="small"
              >
                <MenuItem value="">（選択してください）</MenuItem>
                {shimeiOptions.map(opt => (
                  <MenuItem value={opt.name} key={opt.name}>
                    {opt.name}
                  </MenuItem>
                ))}
              </TextField>
              <FormControl fullWidth size="small">
                <InputLabel>OP（複数選択可）</InputLabel>
                <Select
                  multiple
                  name="op"
                  value={Array.isArray(form.op) ? form.op : []}
                  onChange={handleChange}
                  input={<OutlinedInput label="OP（複数選択可）" />}
                  renderValue={selected => {
                    if (!Array.isArray(selected) || selected.length === 0) return "";
                    const max = 2;
                    const names = selected.slice(0, max).join(", ");
                    return selected.length > max
                      ? names + "..."
                      : names;
                  }}
                >
                  {opOptions.map(opt => (
                    <MenuItem key={opt.name} value={opt.name}>
                      <Checkbox checked={Array.isArray(form.op) && form.op.indexOf(opt.name) > -1} />
                      <ListItemText primary={`${opt.name}（￥${opt.price?.toLocaleString() ?? ""}）`} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>割引（複数選択可）</InputLabel>
                <Select
                  multiple
                  name="discount"
                  value={Array.isArray(form.discount) ? form.discount : []}
                  onChange={handleChange}
                  input={<OutlinedInput label="割引（複数選択可）" />}
                  renderValue={selected => {
                    if (!Array.isArray(selected) || selected.length === 0) return "";
                    const max = 1;
                    const names = selected.slice(0, max).join(", ");
                    return selected.length > max
                      ? names + "..."
                      : names;
                  }}
                >
                  {sortDiscounts(discountOptions).map(opt => (
                    <MenuItem value={opt.code} key={opt.code}>
                      <Checkbox checked={Array.isArray(form.discount) && form.discount.indexOf(opt.code) > -1} />
                      <ListItemText primary={opt.code} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <MonetizationOnIcon sx={{ color: "#6366f1", fontSize: 28 }} />
            <Typography fontWeight={900} fontSize={18} color="#2a2a2a" mr={1}>
              金額：<span style={{ color: "#0ea5e9" }}>￥{adjustedPrice.toLocaleString()}</span>
            </Typography>
            <FormHelperText sx={{ fontWeight: 700, mb: 0.5 }}>
              割引前：￥{basePrice.toLocaleString()}
              {discountAmount > 0 && `　割引：￥${discountAmount.toLocaleString()}`}
              {"　女子給：￥" + (adjustedCastPay || 0).toLocaleString()}
              {form.duration && `　分数：${form.duration}分`}
              {endTime && `　終了予定:${endTime}`}
            </FormHelperText>
            <FormControl sx={{ minWidth: 180 }} required>
              <InputLabel>支払方法 *</InputLabel>
              <Select
                name="payment_method"
                label="支払方法 *"
                value={form.payment_method || ""}
                onChange={handleChange}
                required
                error={!!errors.payment_method}
                size="small"
              >
                <MenuItem value="">（選択してください）</MenuItem>
                {paymentOptions.map(opt => (
                  <MenuItem value={opt.value} key={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
              <FormHelperText>{errors.payment_method}</FormHelperText>
            </FormControl>
            {/* === 金額・女子給調整欄 === */}
            <Box display="flex" alignItems="center" gap={1.5} mt={1}>
              <TextField
                label="金額調整"
                type="number"
                size="small"
                sx={{ minwidth: 150 }}
                value={priceAdjust}
                onChange={e => setPriceAdjust(e.target.value)}
                InputProps={{ endAdornment: <span>円</span> }}
                placeholder="±0"
              />
              <TextField
                label="女子給調整"
                type="number"
                size="small"
                sx={{ minwidth: 150 }}
                value={castPayAdjust}
                onChange={e => setCastPayAdjust(e.target.value)}
                InputProps={{ endAdornment: <span>円</span> }}
                placeholder="±0"
              />
            </Box>
          </Box>
        </Paper>
        <Paper elevation={0} sx={{ bgcolor: "#f9fafb", borderRadius: 3, p: 2, mt: 1 }}>
          <TextField
            label="メモ"
            name="note"
            value={form.note || ""}
            onChange={handleChange}
            fullWidth
            multiline
            minRows={2}
            placeholder="例）気になった点・要望など"
            variant="outlined"
            size="small"
          />
        </Paper>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, bgcolor: "#f1f5f9" }}>
        <Button onClick={onClose}>キャンセル</Button>
        {mode === "edit" && (
          <Button color="error" onClick={handleDelete}>
            削除
          </Button>
        )}
        <Button variant="contained" onClick={handleSave}>保存</Button>
      </DialogActions>
    </Dialog>
  );
}
