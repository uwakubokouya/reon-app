import React, { useState, useMemo } from "react";
import {
  Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem,
  Divider, Chip, Table, TableBody, TableCell, TableRow, Card
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";

const accent = "#6366f1";
const cyan = "#06b6d4";
const magenta = "#e879f9";
const orange = "#ffbc42";
const green = "#16db65";

export default function CastSalaryPanel({ castList = [], dailyReports = [], reservationsMonth = [] }) {
  // アクティブキャストのみ抽出
  const activeCasts = useMemo(
    () => castList.filter(c => c.is_active !== false), // is_activeがtrueまたはundefined
    [castList]
  );
  const [selectedCastId, setSelectedCastId] = useState(activeCasts[0]?.id ?? "");

  // 選択キャスト情報
  const selectedCast = useMemo(
    () => activeCasts.find(c => String(c.id) === String(selectedCastId)),
    [activeCasts, selectedCastId]
  );

  // 当月予約リストから選択キャストの分だけ抽出
  const castReservations = useMemo(
    () => reservationsMonth.filter(r => String(r.cast_id) === String(selectedCastId)),
    [reservationsMonth, selectedCastId]
  );

  // 日別給料リスト
  const castSalaryDays = useMemo(() => {
    const list = [];
    dailyReports.forEach(dr => {
      if (!dr.cast_salary) return;
      let salaryArr = [];
      try {
        salaryArr = typeof dr.cast_salary === "string" ? JSON.parse(dr.cast_salary) : dr.cast_salary;
      } catch {}
      if (Array.isArray(salaryArr)) {
        const target = salaryArr.find(s => String(s.cast_id) === String(selectedCastId));
        if (target) {
          list.push({
            date: dr.date || dr.report_date,
            salary: target.salary || target.total || 0
          });
        }
      }
    });
    return list;
  }, [dailyReports, selectedCastId]);

  // 総額給料
  const totalSalary = castSalaryDays.reduce((acc, d) => acc + Number(d.salary), 0);
  // 総接客数
  const totalGuests = castReservations.length;

  // コース・指名・OP本数カウント
  const courseCount = {}, shimeiCount = {}, opCount = {};
  castReservations.forEach(r => {
    // コース
    if (r.course) courseCount[r.course] = (courseCount[r.course] || 0) + 1;
    // 指名
    const shimei = r.shimei_type || r.shimei || "無し";
    shimeiCount[shimei] = (shimeiCount[shimei] || 0) + 1;
    // OP
    let ops = [];
    try {
      if (typeof r.op === "string" && r.op.startsWith("[")) ops = JSON.parse(r.op);
      else if (Array.isArray(r.op)) ops = r.op;
      if (ops.length === 0) ops = ["なし"];
    } catch { ops = ["不明"]; }
    ops.forEach(op => {
      opCount[op] = (opCount[op] || 0) + 1;
    });
  });

  // 割合計算
  const courseRatio = Object.fromEntries(Object.entries(courseCount).map(([k, v]) => [k, totalGuests ? (v / totalGuests * 100).toFixed(1) : 0]));
  const shimeiRatio = Object.fromEntries(Object.entries(shimeiCount).map(([k, v]) => [k, totalGuests ? (v / totalGuests * 100).toFixed(1) : 0]));
  const opRatio = Object.fromEntries(Object.entries(opCount).map(([k, v]) => [k, totalGuests ? (v / totalGuests * 100).toFixed(1) : 0]));

  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 4, minHeight: 420, bgcolor: "#f7f9fb", boxShadow: "0 6px 28px #6366f111" }}>
      <Box display="flex" gap={3} alignItems="flex-end" mb={3}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>キャスト選択</InputLabel>
          <Select
            value={selectedCastId}
            label="キャスト選択"
            onChange={e => setSelectedCastId(e.target.value)}
          >
            {activeCasts.map(c => (
              <MenuItem value={c.id} key={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {selectedCast && (
          <Box ml={2}>
            <Chip
              icon={<PersonIcon sx={{ color: cyan }} />}
              label={selectedCast.name}
              sx={{ fontWeight: 900, bgcolor: "#e0f2fe", color: cyan, fontSize: 17, px: 2, py: 1.3, borderRadius: 2 }}
              onClick={() => {}}
            />
          </Box>
        )}
      </Box>
      {selectedCast ? (
        <>
          <Box display="flex" gap={4} mb={2}>
            <Card sx={{ flex: 1, p: 2, borderLeft: `5px solid ${green}` }}>
              <Typography color={green} fontWeight={700}>総額給料</Typography>
              <Typography fontWeight={900} fontSize={26} color="#212">{totalSalary.toLocaleString()}円</Typography>
            </Card>
            <Card sx={{ flex: 1, p: 2, borderLeft: `5px solid ${magenta}` }}>
              <Typography color={magenta} fontWeight={700}>総接客数</Typography>
              <Typography fontWeight={900} fontSize={26} color="#212">{totalGuests}件</Typography>
            </Card>
          </Box>

          {/* ======= ここから4パネル行部分 ======= */}
          <Box
            sx={{
              display: "flex",
              gap: 2.5,
              flexWrap: { xs: "wrap", md: "nowrap" },
              alignItems: "stretch",
              mb: 2,
              justifyContent: "flex-start",
            }}
          >
            {/* 出勤日ごとの給料 */}
            <Paper
              elevation={3}
              sx={{
                flex: 2.1,
                minWidth: 230,
                bgcolor: "#fff",
                borderRadius: 3,
                p: 2,
                display: "flex",
                flexDirection: "column",
                height: "100%",
                boxShadow: "0 2px 16px #06b6d415",
              }}
            >
              <Typography fontWeight={900} color={cyan} fontSize={16} mb={1.3}>
                出勤日ごとの給料
              </Typography>
              <Table size="small">
                <TableBody>
                  {castSalaryDays.length ? (
                    castSalaryDays.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: "#555",
                            px: 1,
                            py: 0.6,
                            fontSize: 14.5,
                            borderBottom: "1px solid #f2f4f9",
                          }}
                        >
                          {d.date}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 700,
                            px: 1,
                            py: 0.6,
                            fontSize: 15,
                          }}
                        >
                          {Number(d.salary).toLocaleString()}円
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} align="center" sx={{ color: "#bbb" }}>
                        データなし
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>

            {/* コース本数・割合 */}
            <Paper
              elevation={3}
              sx={{
                flex: 1.1,
                minWidth: 120,
                bgcolor: "#fff",
                borderRadius: 3,
                p: 2,
                boxShadow: "0 2px 12px #818cf810",
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <Typography
                fontWeight={900}
                color={accent}
                fontSize={15}
                mb={1}
                letterSpacing={0.2}
                sx={{ textAlign: "center" }}
              >
                コース
              </Typography>
              <Table size="small">
                <TableBody>
                  {Object.entries(courseCount).length ? (
                    Object.entries(courseCount).map(([k, v]) => (
                      <TableRow key={k}>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: "#555",
                            px: 1,
                            py: 0.6,
                            fontSize: 14.5,
                            borderBottom: "1px solid #f2f4f9",
                          }}
                        >
                          {k}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 700,
                            px: 1,
                            py: 0.6,
                            fontSize: 15,
                          }}
                        >
                          {v}本
                          <span style={{ color: accent, marginLeft: 3, fontWeight: 900, fontSize: 13 }}>
                            ({courseRatio[k]}%)
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} align="center" sx={{ color: "#bbb" }}>
                        －
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>

            {/* 指名本数・割合 */}
            <Paper
              elevation={3}
              sx={{
                flex: 1,
                minWidth: 105,
                bgcolor: "#fff",
                borderRadius: 3,
                p: 2,
                boxShadow: "0 2px 12px #e879f910",
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <Typography
                fontWeight={900}
                color={magenta}
                fontSize={15}
                mb={1}
                letterSpacing={0.2}
                sx={{ textAlign: "center" }}
              >
                指名
              </Typography>
              <Table size="small">
                <TableBody>
                  {Object.entries(shimeiCount).length ? (
                    Object.entries(shimeiCount).map(([k, v]) => (
                      <TableRow key={k}>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: "#555",
                            px: 1,
                            py: 0.6,
                            fontSize: 14.5,
                            borderBottom: "1px solid #f6e9ff",
                          }}
                        >
                          {k}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 700,
                            px: 1,
                            py: 0.6,
                            fontSize: 15,
                          }}
                        >
                          {v}件
                          <span style={{ color: magenta, marginLeft: 3, fontWeight: 900, fontSize: 13 }}>
                            ({shimeiRatio[k]}%)
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} align="center" sx={{ color: "#bbb" }}>
                        －
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>

            {/* OP本数・割合 */}
            <Paper
              elevation={3}
              sx={{
                flex: 1,
                minWidth: 85,
                bgcolor: "#fff",
                borderRadius: 3,
                p: 2,
                boxShadow: "0 2px 12px #ffbc4210",
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <Typography
                fontWeight={900}
                color={orange}
                fontSize={15}
                mb={1}
                letterSpacing={0.2}
                sx={{ textAlign: "center" }}
              >
                OP
              </Typography>
              <Table size="small">
                <TableBody>
                  {Object.entries(opCount).length ? (
                    Object.entries(opCount).map(([k, v]) => (
                      <TableRow key={k}>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: "#555",
                            px: 1,
                            py: 0.6,
                            fontSize: 14.5,
                            borderBottom: "1px solid #fff5e6",
                          }}
                        >
                          {k}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 700,
                            px: 1,
                            py: 0.6,
                            fontSize: 15,
                          }}
                        >
                          {v}件
                          <span style={{ color: orange, marginLeft: 3, fontWeight: 900, fontSize: 13 }}>
                            ({opRatio[k]}%)
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} align="center" sx={{ color: "#bbb" }}>
                        －
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        </>
      ) : (
        <Typography sx={{ mt: 6, fontSize: 22, textAlign: "center", color: "#bbb" }}>
          アクティブキャストがいません
        </Typography>
      )}
    </Paper>
  );
}
