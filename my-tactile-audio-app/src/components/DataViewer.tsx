import React from 'react';

type DataViewerProps = {
  data: Array<{ timestamp: number; value: number }>;
};

export function DataViewer({ data }: DataViewerProps) {
  return (
    <table>
      <thead>
        <tr><th>시간</th><th>값</th></tr>
      </thead>
      <tbody>
        {data.map(({ timestamp, value }, idx) => (
          <tr key={idx}>
            <td>{new Date(timestamp).toLocaleTimeString()}</td>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
