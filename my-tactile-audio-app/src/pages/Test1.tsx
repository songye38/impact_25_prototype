import React, { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Scatter, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface DataPoint {
  value: number;
  label: string;
}

const Test1: React.FC = () => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [transformedData, setTransformedData] = useState<DataPoint[]>([]);
  const [operation, setOperation] = useState<string>("none");
  const [viewMode, setViewMode] = useState<"default" | "all">("default");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [chartType, setChartType] = useState<"bar" | "line" | "scatter" | "pie">("bar");

  // 파일 업로드
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseData(text);
      setData(parsed);
      setTransformedData(parsed);
      const labels = Array.from(new Set(parsed.map(d => d.label)));
      setSelectedLabels(labels);
    };
    reader.readAsText(file);
  };

  const parseData = (text: string): DataPoint[] => {
    const lines = text.split("\n").filter(line => line.trim() !== "");
    return lines.map(line => {
      const [valueStr, label] = line.trim().split(",");
      return { value: Number(valueStr), label };
    });
  };

  // 데이터 변환
  const handleTransform = () => {
    switch (operation) {
      case "normalize":
        normalize();
        break;
      case "delta":
        delta();
        break;
      case "meanByLabel":
        meanByLabel();
        break;
      default:
        setTransformedData(data);
    }
  };

  const normalize = () => {
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const normalized = data.map(d => ({ ...d, value: (d.value - min) / (max - min) }));
    setTransformedData(normalized);
  };

  const delta = () => {
    const deltas = data.map((d, i, arr) =>
      i === 0 ? { ...d, value: 0 } : { ...d, value: d.value - arr[i - 1].value }
    );
    setTransformedData(deltas);
  };

  const meanByLabel = () => {
    const groups: Record<string, number[]> = {};
    data.forEach(d => {
      if (!groups[d.label]) groups[d.label] = [];
      groups[d.label].push(d.value);
    });
    const result: DataPoint[] = [];
    for (const label in groups) {
      const arr = groups[label];
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      result.push({ label, value: avg });
    }
    setTransformedData(result);
  };

  // 기본/통합뷰 선택
  const displayedData = viewMode === "default"
    ? transformedData.filter(d => selectedLabels.includes(d.label))
    : transformedData;

  const toggleLabel = (label: string) => {
    if (selectedLabels.includes(label)) {
      setSelectedLabels(selectedLabels.filter(l => l !== label));
    } else {
      setSelectedLabels([...selectedLabels, label]);
    }
  };

  const allLabels = Array.from(new Set(data.map(d => d.label)));

  // 색상 지정
  const getColor = (label: string) => {
    const colors: Record<string, string> = {
      레이블1: "rgba(75, 192, 192, 0.5)",
      레이블2: "rgba(192, 75, 192, 0.5)",
      레이블3: "rgba(192, 192, 75, 0.5)",
    };
    return colors[label] || "rgba(100, 100, 100, 0.5)";
  };

  // 차트 데이터
  const chartData = chartType === "pie"
    ? {
        labels: Array.from(new Set(displayedData.map(d => d.label))),
        datasets: [
          {
            data: Array.from(new Set(displayedData.map(d => d.label))).map(label => {
              const arr = displayedData.filter(d => d.label === label).map(d => d.value);
              return arr.reduce((a, b) => a + b, 0);
            }),
            backgroundColor: Array.from(new Set(displayedData.map(d => d.label))).map(getColor),
          },
        ],
      }
    : {
        labels: displayedData.map((_, i) => `#${i + 1}`),
        datasets: Array.from(new Set(displayedData.map(d => d.label))).map(label => ({
          label,
          data: displayedData.filter(d => d.label === label).map(d => d.value),
          backgroundColor: chartType === "line" ? undefined : getColor(label),
          borderColor: chartType === "line" ? getColor(label) : undefined,
          fill: chartType === "line" ? false : undefined,
        })),
      };

  // Scatter용 변환
  const chartDataScatter = {
    datasets: Array.from(new Set(displayedData.map(d => d.label))).map(label => ({
      label,
      data: displayedData
        .map((d, i) => ({ ...d, index: i }))
        .filter(d => d.label === label)
        .map(d => ({ x: d.index + 1, y: d.value })),
      backgroundColor: getColor(label),
    })),
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>데이터 탐색 앱</h1>

      <div style={{ marginBottom: "20px" }}>
        <input type="file" accept=".txt" onChange={handleFileUpload} />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <select value={operation} onChange={e => setOperation(e.target.value)}>
          <option value="none">None</option>
          <option value="normalize">정규화</option>
          <option value="delta">변화량</option>
          <option value="meanByLabel">라벨별 평균</option>
        </select>
        <button onClick={handleTransform} style={{ marginLeft: "10px" }}>적용</button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <select value={viewMode} onChange={e => setViewMode(e.target.value as "default" | "all")}>
          <option value="default">기본 뷰 (레이블별)</option>
          <option value="all">통합 뷰 (전체)</option>
        </select>
      </div>

      {viewMode === "default" && (
        <div style={{ marginBottom: "20px" }}>
          {allLabels.map(label => (
            <label key={label} style={{ marginRight: "10px" }}>
              <input
                type="checkbox"
                checked={selectedLabels.includes(label)}
                onChange={() => toggleLabel(label)}
              />
              {label}
            </label>
          ))}
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <select value={chartType} onChange={e => setChartType(e.target.value as any)}>
          <option value="bar">막대차트</option>
          <option value="line">선차트</option>
          <option value="scatter">점차트</option>
          <option value="pie">파이차트</option>
        </select>
      </div>

      {/* 2열 레이아웃 */}
      <div style={{ display: "flex", gap: "20px" }}>
        {/* 테이블 */}
        <div style={{ flex: 1 }}>
          <h2>테이블 뷰</h2>
          <table border={1} cellPadding={5} style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th>값</th>
                <th>라벨</th>
              </tr>
            </thead>
            <tbody>
              {displayedData.map((d, i) => (
                <tr key={i}>
                  <td>{d.value.toFixed(2)}</td>
                  <td>{d.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 차트 */}
        <div style={{ flex: 1 }}>
          <h2>차트 뷰</h2>
          {chartType === "bar" && <Bar data={chartData} />}
          {chartType === "line" && <Line data={chartData} />}
          {chartType === "scatter" && <Scatter data={chartDataScatter} />}
          {chartType === "pie" && <Pie data={chartData} />}
        </div>
      </div>
    </div>
  );
};

export default Test1;