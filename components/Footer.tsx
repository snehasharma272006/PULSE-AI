export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        background: "transparent", // page background stays untouched
        borderTop: "1px solid rgba(27, 35, 51, 0.08)", // matches --border
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: "0.5rem",
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.85rem",
          color: "rgba(27, 35, 51, 0.6)", // matches your nav-link resting color
        }}
      >
        <p style={{ margin: 0 }}>© {year} Pulse AI. All rights reserved.</p>
        <p style={{ margin: 0 }}>Made with ❤️ by Sneha Sharma</p>
      </div>
    </footer>
  );
}