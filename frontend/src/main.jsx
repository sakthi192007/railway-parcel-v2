import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { api } from "./services/api";
import "./styles.css";

const RATE_PER_KG = 40; // default charge per kg (editable in the form)

const errText = (e, fallback) =>
  e?.response?.data?.message ||
  e?.response?.data?.error ||
  (e?.response
    ? `${fallback} (HTTP ${e.response.status})`
    : "No response from the backend. Either the server is down, this URL does not exist (404), or the browser blocked it (CORS)");

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function App() {
  const [tab, setTab] = useState("parcels");
  const [parcels, setParcels] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [trains, setTrains] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [trainFilter, setTrainFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null); // { type: "ok" | "error", text }

  const notify = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4500);
  };

  const loadAll = async () => {
    setLoading(true);
    const [p, c, t] = await Promise.allSettled([
      api.get("/parcels"),
      api.get("/customers"),
      api.get("/trains"),
    ]);

    if (p.status === "fulfilled") setParcels(p.value.data);
    else notify("error", errText(p.reason, "Unable to load parcels"));

    if (c.status === "fulfilled") setCustomers(c.value.data);
    if (t.status === "fulfilled") setTrains(t.value.data);

    setLoading(false);
  };

  // NEW: reload only the customers list (used after adding a customer)
  const reloadCustomers = async () => {
    const res = await api.get("/customers");
    setCustomers(res.data);
  };

  useEffect(() => {
    loadAll();
  }, []);

  /* If /trains is unavailable, build the train list from existing parcels */
  const trainList = useMemo(() => {
    if (trains.length) return trains;
    const map = new Map();
    parcels.forEach((p) => {
      if (p.trainId && !map.has(p.trainId)) {
        map.set(p.trainId, {
          trainId: p.trainId,
          trainNo: p.trainNo,
          trainName: p.trainName,
          source: p.source,
          destination: p.destination,
        });
      }
    });
    return [...map.values()];
  }, [trains, parcels]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/parcels/${id}/status`, { status });
      notify("ok", `Parcel #${id} is now ${status.replace("_", " ")}. Tracking record added.`);
      await loadAll();
    } catch (e) {
      notify("error", errText(e, "Could not update status"));
    }
  };

  const filteredParcels = useMemo(() => {
    const text = search.toLowerCase();
    return parcels.filter((p) => {
      const matchesSearch =
        String(p.parcelId ?? "").includes(text) ||
        [p.customerName, p.trainName, p.trainNo, p.source, p.destination, p.description]
          .map((v) => String(v ?? "").toLowerCase())
          .some((v) => v.includes(text));
      const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
      const matchesTrain = trainFilter === "ALL" || p.trainName === trainFilter;
      return matchesSearch && matchesStatus && matchesTrain;
    });
  }, [parcels, search, statusFilter, trainFilter]);

  const total = parcels.length;
  const booked = parcels.filter((p) => p.status === "BOOKED").length;
  const inTransit = parcels.filter((p) => p.status === "IN_TRANSIT").length;
  const delivered = parcels.filter((p) => p.status === "DELIVERED").length;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

  const exportCsv = () => {
    const header = ["ID", "Customer", "Train", "Route", "Item", "Weight (kg)", "Charge", "Status", "Booked at"];
    const rows = filteredParcels.map((p) => [
      p.parcelId,
      p.customerName,
      `${p.trainName} (${p.trainNo})`,
      `${p.source} to ${p.destination}`,
      p.description,
      p.weightKg,
      p.charge,
      p.status,
      p.bookedAt,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "parcels.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const navItems = [
    ["parcels", "▣", "Parcels"],
    ["book", "＋", "Book Parcel"],
    ["customers", "♙", "Customers"],
    ["trains", "🚆", "Trains"],
    ["tracking", "⌖", "Tracking"],
    ["reports", "▥", "Reports"],
  ];

  return (
    <div className="app">
      {/* ================= SIDEBAR ================= */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">🚆</div>
          <div>
            <h2>Railway Parcel</h2>
            <span>Management System</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(([key, icon, label]) => (
            <button
              key={key}
              className={tab === key ? "nav-item active" : "nav-item"}
              onClick={() => setTab(key)}
            >
              <span>{icon}</span>
              <label>{label}</label>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item">
            <span>⚙</span>
            <label>Settings</label>
          </button>
          <button className="nav-item">
            <span>⇥</span>
            <label>Logout</label>
          </button>
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <main className="main">
        <header className="topbar">
          <button className="menu-btn">☰</button>

          <div className="global-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search parcel ID, customer, train..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (tab !== "parcels") setTab("parcels");
              }}
            />
          </div>

          <div className="top-right">
            <button
              className="notification"
              title={`${booked} parcels waiting to be dispatched`}
              onClick={() => {
                setStatusFilter("BOOKED");
                setTab("parcels");
              }}
            >
              🔔
              {booked > 0 && <b>{booked}</b>}
            </button>

            <div className="user-profile">
              <div className="user-avatar">S</div>
              <div className="user-details">
                <strong>Sakthi</strong>
                <small>Administrator</small>
              </div>
              <span>⌄</span>
            </div>
          </div>
        </header>

        <div className="content">
          {/* ================= HERO ================= */}
          <section className="hero">
            <div className="hero-text">
              <span>RAILWAY PARCEL SERVICES</span>
              <h1>Railway Parcel Management</h1>
              <p>Manage customers, trains and parcels</p>
            </div>
            <div className="hero-decoration">🚆</div>
          </section>

          {/* ================= STATS ================= */}
          <section className="stats-grid">
            <Stat type="blue" icon="📦" title="Total Parcels" value={total} description="All bookings" />
            <Stat type="green" icon="✓" title="Booked" value={booked} description={`${pct(booked)}% of total`} />
            <Stat type="orange" icon="🚚" title="In Transit" value={inTransit} description={`${pct(inTransit)}% of total`} />
            <Stat type="red" icon="✓" title="Delivered" value={delivered} description={`${pct(delivered)}% of total`} />
          </section>

          {/* ================= QUICK NAV ================= */}
          <div className="quick-nav">
            {[
              ["parcels", "📦 Parcels"],
              ["book", "＋ Book Parcel"],
              ["customers", "♙ Customers"],
              ["trains", "🚆 Trains"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={tab === key ? "quick-item active" : "quick-item"}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}

            <button className="book-button" onClick={() => setTab("book")}>
              ＋ Book New Parcel
            </button>
          </div>

          {/* ================= MESSAGE ================= */}
          {msg && (
            <div className={msg.type === "error" ? "error-message" : "success-message"}>
              {msg.type === "error" ? "!" : "✓"} {msg.text}
            </div>
          )}

          {/* ================= PAGES ================= */}
          {tab === "parcels" && (
            <ParcelsPage
              loading={loading}
              parcels={parcels}
              filtered={filteredParcels}
              trainList={trainList}
              search={search}
              setSearch={setSearch}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              trainFilter={trainFilter}
              setTrainFilter={setTrainFilter}
              updateStatus={updateStatus}
              exportCsv={exportCsv}
            />
          )}

          {tab === "book" && (
            <BookParcelPage
              customers={customers}
              reloadCustomers={reloadCustomers}
              trainList={trainList}
              notify={notify}
              onBooked={async () => {
                await loadAll();
                setStatusFilter("ALL");
                setSearch("");
                setTab("parcels");
              }}
              onCancel={() => setTab("parcels")}
            />
          )}

          {tab === "customers" && (
            <CustomersPage customers={customers} parcels={parcels} />
          )}

          {tab === "trains" && (
            <TrainsPage trainList={trainList} parcels={parcels} />
          )}

          {tab === "reports" && <ReportsPage parcels={parcels} />}

          {tab === "tracking" && <TrackingPage parcels={parcels} />}
        </div>
      </main>
    </div>
  );
}

/* ================= PARCELS PAGE ================= */

function ParcelsPage({
  loading,
  parcels,
  filtered,
  trainList,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  trainFilter,
  setTrainFilter,
  updateStatus,
  exportCsv,
}) {
  return (
    <section className="parcel-card">
      <div className="section-header">
        <div className="section-title">
          <div className="section-icon">📦</div>
          <div>
            <h2>Parcel List</h2>
            <p>View and manage all parcel bookings with customer and train information.</p>
          </div>
        </div>
        <button className="export-button" onClick={exportCsv}>
          ↓ Export CSV
        </button>
      </div>

      <div className="filters">
        <div className="filter-search">
          <span>⌕</span>
          <input
            placeholder="Search by ID, customer, train, route, item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Status</option>
          <option value="BOOKED">Booked</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="DELIVERED">Delivered</option>
        </select>

        <select value={trainFilter} onChange={(e) => setTrainFilter(e.target.value)}>
          <option value="ALL">All Trains</option>
          {trainList.map((t) => (
            <option key={t.trainId} value={t.trainName}>
              {t.trainName}
            </option>
          ))}
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Train</th>
              <th>Route</th>
              <th>Item</th>
              <th>Weight</th>
              <th>Charge</th>
              <th>Status</th>
              <th>Update status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="empty-row">Loading parcels...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty-row">
                  No parcels match these filters.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.parcelId}>
                  <td className="parcel-id">#{p.parcelId}</td>

                  <td>
                    <div className="customer">
                      <div className="customer-avatar">
                        {(p.customerName || "C").charAt(0).toUpperCase()}
                      </div>
                      <strong>{p.customerName || "Unknown"}</strong>
                    </div>
                  </td>

                  <td>
                    <div className="train-info">
                      <span>🚆</span>
                      <div>
                        <strong>{p.trainName || "—"}</strong>
                        <small>{p.trainNo}</small>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="route">
                      <span className="source-dot">●</span>
                      <span>{p.source}</span>
                      <b>→</b>
                      <span className="destination-dot">●</span>
                      <span>{p.destination}</span>
                    </div>
                  </td>

                  <td>{p.description || "—"}</td>
                  <td>{p.weightKg} kg</td>
                  <td className="charge">{money(p.charge)}</td>

                  <td>
                    <StatusBadge status={p.status} />
                  </td>

                  <td>
                    <select
                      className="action-select"
                      value={p.status}
                      onChange={(e) => updateStatus(p.parcelId, e.target.value)}
                    >
                      <option value="BOOKED">BOOKED</option>
                      <option value="IN_TRANSIT">IN_TRANSIT</option>
                      <option value="DELIVERED">DELIVERED</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>
          Showing <strong>{filtered.length}</strong> of <strong>{parcels.length}</strong> parcels
        </span>
      </div>
    </section>
  );
}

/* ================= BOOK PARCEL PAGE ================= */

function BookParcelPage({ customers, reloadCustomers, trainList, notify, onBooked, onCancel }) {
  const [form, setForm] = useState({
    customerId: "",
    trainId: "",
    description: "",
    weightKg: "",
  });
  const [chargeOverride, setChargeOverride] = useState(null);
  const [saving, setSaving] = useState(false);

  // NEW: add-customer popup state
  const [showNew, setShowNew] = useState(false);
  const [newCust, setNewCust] = useState({ name: "", phone: "", email: "", address: "" });
  const [savingCust, setSavingCust] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // NEW: open the popup when "+ Add new customer" is picked
  const onCustomerChange = (e) => {
    if (e.target.value === "__new__") {
      setShowNew(true);
      return; // keep the dropdown on its current value
    }
    setForm({ ...form, customerId: e.target.value });
  };

  // NEW: save the customer, reload the list, auto-select the new one
  const saveCustomer = async () => {
    if (!newCust.name.trim() || !newCust.phone.trim()) {
      notify("error", "Customer name and phone are required.");
      return;
    }
    setSavingCust(true);
    try {
      const res = await api.post("/customers", {
        name: newCust.name.trim(),
        phone: newCust.phone.trim(),
        email: newCust.email.trim(),
        address: newCust.address.trim(),
      });
      await reloadCustomers();
      setForm((f) => ({ ...f, customerId: String(res.data.customerId) }));
      setNewCust({ name: "", phone: "", email: "", address: "" });
      setShowNew(false);
      notify("ok", "Customer added.");
    } catch (err) {
      notify("error", errText(err, "Could not add customer"));
    } finally {
      setSavingCust(false);
    }
  };

  const autoCharge = form.weightKg ? Math.round(Number(form.weightKg) * RATE_PER_KG) : 0;
  const charge = chargeOverride ?? autoCharge;
  const selectedTrain = trainList.find((t) => String(t.trainId) === String(form.trainId));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/parcels/book", {
        customerId: Number(form.customerId),
        trainId: Number(form.trainId),
        description: form.description.trim(),
        weightKg: Number(form.weightKg),
        charge: Number(charge),
        status: "BOOKED",
      });
      notify("ok", "Parcel booked successfully.");
      await onBooked();
    } catch (err) {
      notify("error", errText(err, "Booking failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="parcel-card">
      <div className="section-header">
        <div className="section-title">
          <div className="section-icon">＋</div>
          <div>
            <h2>Book Parcel</h2>
            <p>Choose a customer and a train, then enter what is being sent.</p>
          </div>
        </div>
      </div>

      <form className="form-body" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Customer">
            <select required value={form.customerId} onChange={onCustomerChange}>
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.customerId} value={c.customerId}>
                  {c.name} · {c.phone}
                </option>
              ))}
              <option value="__new__">＋ Add new customer</option>
            </select>
          </Field>

          <Field label="Train" hint={selectedTrain ? `${selectedTrain.source} → ${selectedTrain.destination}` : ""}>
            <select required value={form.trainId} onChange={set("trainId")}>
              <option value="">Select train</option>
              {trainList.map((t) => (
                <option key={t.trainId} value={t.trainId}>
                  {t.trainName} ({t.trainNo})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Item description">
            <input
              required
              placeholder="e.g. Documents, Books, Electronics"
              value={form.description}
              onChange={set("description")}
            />
          </Field>

          <Field label="Weight (kg)">
            <input
              required
              type="number"
              min="0.1"
              step="0.1"
              placeholder="0.0"
              value={form.weightKg}
              onChange={set("weightKg")}
            />
          </Field>

          <Field label="Charge (₹)" hint={`Calculated at ₹${RATE_PER_KG} per kg. You can change it.`}>
            <input
              required
              type="number"
              min="0"
              value={charge}
              onChange={(e) => setChargeOverride(e.target.value)}
            />
          </Field>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Booking..." : "Book parcel"}
          </button>
        </div>
      </form>

      {/* NEW: customer popup (outside the <form> so it doesn't submit the booking) */}
      {showNew && (
        <div className="modal-backdrop" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>New customer</h3>
            <div className="form-grid single">
              <Field label="Name">
                <input
                  autoFocus
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <input
                  value={newCust.phone}
                  onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                />
              </Field>
              <Field label="Email (optional)">
                <input
                  type="email"
                  value={newCust.email}
                  onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                />
              </Field>
              <Field label="Address (optional)">
                <input
                  value={newCust.address}
                  onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
                />
              </Field>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowNew(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={saveCustomer} disabled={savingCust}>
                {savingCust ? "Saving..." : "Save customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ================= CUSTOMERS PAGE ================= */

function CustomersPage({ customers, parcels }) {
  return (
    <section className="parcel-card">
      <div className="section-header">
        <div className="section-title">
          <div className="section-icon">♙</div>
          <div>
            <h2>Customers</h2>
            <p>{customers.length} registered. Select a customer when booking a parcel.</p>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="compact">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>Parcels</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-row">No customers found.</td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.customerId}>
                  <td>
                    <div className="customer">
                      <div className="customer-avatar">{(c.name || "C").charAt(0).toUpperCase()}</div>
                      <strong>{c.name}</strong>
                    </div>
                  </td>
                  <td>{c.phone}</td>
                  <td>{c.email || "—"}</td>
                  <td>{c.address || "—"}</td>
                  <td>{parcels.filter((p) => p.customerId === c.customerId).length}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ================= TRAINS PAGE ================= */

function TrainsPage({ trainList, parcels }) {
  return (
    <section className="parcel-card">
      <div className="section-header">
        <div className="section-title">
          <div className="section-icon">🚆</div>
          <div>
            <h2>Trains</h2>
            <p>{trainList.length} trains available for parcels.</p>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="compact">
          <thead>
            <tr>
              <th>Train</th>
              <th>Number</th>
              <th>Route</th>
              <th>Parcels</th>
            </tr>
          </thead>
          <tbody>
            {trainList.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-row">No trains found.</td>
              </tr>
            ) : (
              trainList.map((t) => (
                <tr key={t.trainId}>
                  <td>
                    <div className="train-info">
                      <span>🚆</span>
                      <strong>{t.trainName}</strong>
                    </div>
                  </td>
                  <td>{t.trainNo}</td>
                  <td>
                    <div className="route">
                      <span className="source-dot">●</span>
                      <span>{t.source}</span>
                      <b>→</b>
                      <span className="destination-dot">●</span>
                      <span>{t.destination}</span>
                    </div>
                  </td>
                  <td>{parcels.filter((p) => p.trainId === t.trainId).length}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ================= REPORTS PAGE ================= */

// 👉 Set this to the URL of YOUR existing endpoint that runs the
//    "trains carrying more parcels than average" query.
//    It is added to http://localhost:8083/api  (see services/api.js)
const BUSY_TRAINS_ENDPOINT = "/trains/above-average";

const prettyKey = (k) =>
  String(k)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

const isCountKey = (k) => /count|total|parcels|no_of|number_of/i.test(k) && !/train_?no/i.test(k);

function ReportsPage({ parcels }) {
  const [rawRows, setRawRows] = useState([]);
  const [average, setAverage] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Reload whenever parcels change (new booking, status change)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(BUSY_TRAINS_ENDPOINT)
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        const list = Array.isArray(d) ? d : d?.trains ?? d?.data ?? d?.rows ?? [];
        setRawRows(list);

        // optional: show an average if the API returns one
        const avgKey = !Array.isArray(d) && d ? Object.keys(d).find((k) => /avg|average/i.test(k)) : null;
        setAverage(avgKey ? d[avgKey] : null);
        setError("");
      })
      .catch((e) => {
        if (!cancelled) setError(errText(e, "Could not load the report"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parcels]);

  // The endpoint returns trains only, so add each train's parcel count and the average here
  const trainCounts = useMemo(() => {
    const m = {};
    parcels.forEach((p) => {
      m[p.trainId] = (m[p.trainId] || 0) + 1;
    });
    return m;
  }, [parcels]);

  const rows = useMemo(
    () =>
      rawRows.map((r) => {
        if (Object.keys(r).some(isCountKey)) return r;
        const idKey = findKey(r, /train_?id/i);
        return idKey ? { ...r, parcels: trainCounts[r[idKey]] || 0 } : r;
      }),
    [rawRows, trainCounts]
  );

  const countsList = Object.values(trainCounts);
  const computedAvg = countsList.length ? countsList.reduce((a, b) => a + b, 0) / countsList.length : null;
  const shownAverage = average ?? computedAvg;

  const columns = rows.length ? Object.keys(rows[0]) : [];
  const countKey = columns.find(isCountKey);
  const max = countKey ? Math.max(...rows.map((r) => Number(r[countKey]) || 0), 1) : 1;

  const cell = (key, value) => {
    if (value === null || value === undefined || value === "") return "—";
    if (/charge|amount|price|revenue/i.test(key)) return money(value);
    return String(value);
  };

  return (
    <section className="parcel-card">
      <div className="section-header">
        <div className="section-title">
          <div className="section-icon">▥</div>
          <div>
            <h2>Trains above average parcels</h2>
            <p>Trains carrying more parcels than the average train.</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="report-error">
          {error}. Check that <code>BUSY_TRAINS_ENDPOINT</code> in <code>main.jsx</code> matches
          your backend URL (currently <code>{BUSY_TRAINS_ENDPOINT}</code>).
        </div>
      ) : (
        <>
          <div className="report-summary">
            <div>
              <span>Trains above average</span>
              <strong>{loading ? "…" : rows.length}</strong>
            </div>
            {shownAverage !== null && (
              <div>
                <span>Average parcels per train</span>
                <strong>{Number(shownAverage).toFixed(2).replace(/\.?0+$/, "")}</strong>
              </div>
            )}
          </div>

          <div className="table-container">
            <table className="compact">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{prettyKey(c)}</th>
                  ))}
                  {countKey && <th>Load</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={columns.length + 1 || 1} className="empty-row">
                      Loading report...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1 || 1} className="empty-row">
                      No train is above the average right now.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i}>
                      {columns.map((c) => (
                        <td key={c} className={c === countKey ? "charge" : undefined}>
                          {cell(c, r[c])}
                        </td>
                      ))}
                      {countKey && (
                        <td>
                          <div className="load-bar">
                            <div
                              className="load-fill"
                              style={{ width: `${((Number(r[countKey]) || 0) / max) * 100}%` }}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

/* ================= TRACKING PAGE ================= */

const findKey = (obj, re) => Object.keys(obj).find((k) => re.test(k));

function TrackingPage({ parcels }) {
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Reload after every booking / status update (parcels change).
  // The backend returns tracking per parcel: GET /parcels/{id}/tracking
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(
      parcels.map((p) =>
        api
          .get(`/parcels/${p.parcelId}/tracking`)
          .then((res) =>
            (Array.isArray(res.data) ? res.data : []).map((r) => ({ ...r, __parcelId: p.parcelId }))
          )
      )
    )
      .then((lists) => {
        if (cancelled) return;
        setRecords(lists.flat());
        setError("");
      })
      .catch((e) => {
        if (!cancelled) setError(errText(e, "Could not load tracking records"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parcels]);

  // Normalise whatever columns the tracking table returns
  const events = useMemo(() => {
    return records.map((r) => {
      const statusKey = findKey(r, /new_?status/i) || findKey(r, /status/i);
      const timeKey = findKey(r, /time|date|updated|created|_at$/i);
      const noteKey = findKey(r, /location|remark|note|desc|message|comment/i);
      return {
        parcelId: r.__parcelId,
        status: statusKey ? r[statusKey] : "",
        time: timeKey ? String(r[timeKey]) : "",
        note: noteKey ? r[noteKey] : "",
      };
    });
  }, [records]);

  // Group by parcel, newest event first
  const groups = useMemo(() => {
    const map = new Map();
    events.forEach((ev) => {
      if (!map.has(ev.parcelId)) map.set(ev.parcelId, []);
      map.get(ev.parcelId).push(ev);
    });
    const list = [...map.entries()].map(([parcelId, evs]) => ({
      parcelId,
      events: evs.sort((x, y) => String(y.time).localeCompare(String(x.time))),
    }));
    list.sort((x, y) => String(y.events[0]?.time).localeCompare(String(x.events[0]?.time)));
    return list;
  }, [events]);

  const text = query.trim().toLowerCase();
  const visible = groups.filter((g) => {
    if (!text) return true;
    const p = parcels.find((x) => String(x.parcelId) === String(g.parcelId));
    return (
      String(g.parcelId).includes(text) ||
      String(p?.customerName ?? "").toLowerCase().includes(text) ||
      String(p?.trainName ?? "").toLowerCase().includes(text)
    );
  });

  return (
    <section className="parcel-card">
      <div className="section-header">
        <div className="section-title">
          <div className="section-icon">⌖</div>
          <div>
            <h2>Parcel tracking</h2>
            <p>Every status change adds a tracking record. Newest events are shown first.</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="report-error">{error}.</div>
      ) : (
        <>
          <div className="filters tracking-filter">
            <div className="filter-search">
              <span>⌕</span>
              <input
                placeholder="Find by parcel ID, customer or train..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="tracking-list">
            {loading ? (
              <div className="empty-row">Loading tracking records...</div>
            ) : visible.length === 0 ? (
              <div className="empty-row">
                No tracking records yet. Change a parcel's status on the Parcels page to create one.
              </div>
            ) : (
              visible.map((g) => {
                const p = parcels.find((x) => String(x.parcelId) === String(g.parcelId));
                return (
                  <article className="track-card" key={g.parcelId}>
                    <header className="track-head">
                      <strong className="parcel-id">#{g.parcelId}</strong>
                      <span>
                        {p ? `${p.customerName} · ${p.trainName} · ${p.source} → ${p.destination}` : "Parcel"}
                      </span>
                      <em>
                        {g.events.length} {g.events.length === 1 ? "record" : "records"}
                      </em>
                    </header>

                    <ol className="timeline">
                      {g.events.map((ev, i) => (
                        <li key={i} className={i === 0 ? "latest" : ""}>
                          <div className="tl-top">
                            <StatusBadge status={ev.status} />
                            <time>{ev.time || "—"}</time>
                          </div>
                          {ev.note ? <p>{ev.note}</p> : null}
                        </li>
                      ))}
                    </ol>
                  </article>
                );
              })
            )}
          </div>
        </>
      )}
    </section>
  );
}

/* ================= SMALL COMPONENTS ================= */

function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function Stat({ type, icon, title, value, description }) {
  return (
    <div className={`stat-card ${type}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const formatted = status ? status.replace("_", " ") : "UNKNOWN";
  const cls =
    status === "BOOKED" ? "booked" : status === "IN_TRANSIT" ? "transit" : status === "DELIVERED" ? "delivered" : "";
  return (
    <span className={`status-badge ${cls}`}>
      <i></i>
      {formatted}
    </span>
  );
}

createRoot(document.getElementById("root")).render(<App />);