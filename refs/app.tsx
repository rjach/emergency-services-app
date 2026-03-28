import { useState } from "react";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<
    "login" | "user-dashboard" | "agency-dashboard"
  >("login");
  const [loginMode, setLoginMode] = useState<"user" | "agency">("user");
  const [authType, setAuthType] = useState<"login" | "signup">("login");

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginMode === "user") {
      setCurrentScreen("user-dashboard");
    } else {
      setCurrentScreen("agency-dashboard");
    }
  };

  if (currentScreen === "user-dashboard") {
    return <UserDashboard onLogout={() => setCurrentScreen("login")} />;
  }

  if (currentScreen === "agency-dashboard") {
    return <AgencyDashboard onLogout={() => setCurrentScreen("login")} />;
  }

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex flex-col items-center justify-center p-4 relative z-0">
      {/* Hero Decorative Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-primary-container/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-secondary-container/20 blur-[150px]"></div>
      </div>

      <main className="w-full max-w-[520px] flex flex-col gap-8">
        {/* Header / Brand Identity */}
        <div className="text-center space-y-3">
          <h1 className="font-headline font-extrabold text-4xl tracking-tighter text-primary">
            RapidAid
          </h1>
          <p className="text-on-surface-variant font-medium tracking-wide">
            The Serene Guardian
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-[0_12px_32px_-4px_rgba(27,28,25,0.06)]">
          {/* Main Role Switcher */}
          <div className="flex p-1 bg-surface-container-low rounded-xl mb-6">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-bold transition-all rounded-lg flex items-center justify-center gap-2 ${
                loginMode === "user"
                  ? "bg-white text-primary shadow-sm"
                  : "text-outline"
              }`}
              onClick={() => setLoginMode("user")}
            >
              <span className="material-symbols-outlined text-lg">person</span>
              User
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-bold transition-all rounded-lg flex items-center justify-center gap-2 ${
                loginMode === "agency"
                  ? "bg-white text-primary shadow-sm"
                  : "text-outline"
              }`}
              onClick={() => setLoginMode("agency")}
            >
              <span className="material-symbols-outlined text-lg">
                corporate_fare
              </span>
              Agency Admin
            </button>
          </div>

          {/* Auth Type Switcher (Login/Signup) */}
          <div className="flex p-1 bg-surface-container-low/50 rounded-xl mb-8">
            <button
              type="button"
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                authType === "login"
                  ? "text-primary bg-surface-container-lowest shadow-sm"
                  : "text-on-surface-variant hover:text-primary"
              }`}
              onClick={() => setAuthType("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                authType === "signup"
                  ? "text-primary bg-surface-container-lowest shadow-sm"
                  : "text-on-surface-variant hover:text-primary"
              }`}
              onClick={() => setAuthType("signup")}
            >
              Sign Up
            </button>
          </div>

          {/* Form Content */}
          <form className="space-y-5" onSubmit={handleAuth}>
            {authType === "signup" && loginMode === "agency" && (
              <div className="space-y-2">
                <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                  Agency Name
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">
                    apartment
                  </span>
                  <input
                    className="w-full pl-12 pr-4 py-3.5 bg-surface-variant border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/60 text-on-surface"
                    placeholder="Emergency Services Co."
                    type="text"
                    required
                  />
                </div>
              </div>
            )}

            {authType === "signup" && (
              <div className="space-y-2">
                <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                  Phone Number
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">
                    call
                  </span>
                  <input
                    className="w-full pl-12 pr-4 py-3.5 bg-surface-variant border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/60 text-on-surface"
                    placeholder="+1 (555) 000-0000"
                    type="tel"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                Email
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">
                  mail
                </span>
                <input
                  className="w-full pl-12 pr-4 py-3.5 bg-surface-variant border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/60 text-on-surface"
                  placeholder="name@example.com"
                  type="email"
                  required
                />
              </div>
            </div>

            {authType === "signup" && loginMode === "agency" && (
              <>
                <div className="space-y-2">
                  <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                    Service Type
                  </label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">
                      medical_services
                    </span>
                    <select
                      className="w-full pl-12 pr-4 py-3.5 bg-surface-variant border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-on-surface appearance-none"
                      required
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select service type
                      </option>
                      <option value="medical">Medical Response</option>
                      <option value="fire">Fire Department</option>
                      <option value="police">Law Enforcement</option>
                      <option value="rescue">Search & Rescue</option>
                      <option value="disaster">Disaster Relief</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                    Address
                  </label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">
                      location_on
                    </span>
                    <input
                      className="w-full pl-12 pr-4 py-3.5 bg-surface-variant border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/60 text-on-surface"
                      placeholder="123 Response Way, Central City"
                      type="text"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">
                  Password
                </label>
                {authType === "login" && (
                  <a
                    className="text-[0.6875rem] font-bold text-secondary uppercase tracking-wider hover:underline"
                    href="#"
                  >
                    Forgot?
                  </a>
                )}
              </div>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">
                  lock
                </span>
                <input
                  className="w-full pl-12 pr-12 py-3.5 bg-surface-variant border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/60 text-on-surface"
                  placeholder="••••••••"
                  type="password"
                  required
                />
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined">visibility</span>
                </button>
              </div>
            </div>

            <button
              className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-2xl shadow-lg shadow-primary/10 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
              type="submit"
            >
              <span>
                {authType === "login" ? "Login to Dashboard" : "Create Account"}
              </span>
              <span className="material-symbols-outlined text-lg">
                arrow_forward
              </span>
            </button>
          </form>
        </div>

        {/* Emergency / Accountless Access */}
        <div className="flex flex-col gap-4 items-center">
          <div className="flex items-center gap-3 py-3 px-6 bg-tertiary-fixed rounded-full urgency-pulse shadow-sm cursor-pointer hover:scale-105 transition-transform">
            <span
              className="material-symbols-outlined text-on-tertiary-fixed"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              emergency
            </span>
            <a
              className="text-sm font-bold text-on-tertiary-fixed tracking-tight hover:underline"
              href="#"
            >
              Continue without account for emergency help
            </a>
          </div>
          <p className="text-xs text-on-surface-variant/70 text-center max-w-[300px] leading-relaxed">
            By continuing, you agree to RapidAid’s{" "}
            <a className="underline" href="#">
              Terms of Service
            </a>{" "}
            and{" "}
            <a className="underline" href="#">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </main>

      {/* Visual Anchor */}
      <div className="hidden lg:block fixed left-12 bottom-12 w-48 h-48">
        <div className="relative w-full h-full rounded-3xl overflow-hidden bg-surface-container-low">
          <img
            alt="Calm morning mist"
            className="w-full h-full object-cover opacity-60"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUdvpbQKswrUhzSxQx9P52QnGbNLUjcpbePdhtxqR25z3exSdQU-5j_lSoN6Ie-s5mG-tt7zfatpKuAlrcSi8JEZpXm6rlkMHgMFmk-qornibAgEfA0xQPRH-0I5RNnVBosbdXY3cFt8ffplxSKCyiXVpfSeu69C6Z4REra0YlrJnnd_W3Ms3BuWkLFBqbaVOp3-QPcbgJY-NM3SLGTScLIr76XFay5lckwWHWLT8Q2GSBQQ4qhQJ16J7KDk5TKJy6KDvKUdFfKoY"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low to-transparent"></div>
        </div>
      </div>
    </div>
  );
}

function UserDashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex flex-col">
      <header className="bg-surface-container-lowest px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl">
            health_and_safety
          </span>
          <h1 className="font-headline font-extrabold text-2xl tracking-tighter text-primary">
            RapidAid
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-full hover:bg-surface-container transition-colors relative">
            <span className="material-symbols-outlined text-on-surface-variant">
              notifications
            </span>
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface-container-lowest"></span>
          </button>
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={onLogout}
          >
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
              JD
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-bold">John Doe</p>
              <p className="text-xs text-on-surface-variant">Sign out</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col gap-8">
        {/* Emergency Action */}
        <section className="bg-error-container rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-on-error-container mb-2">
              Need Immediate Help?
            </h2>
            <p className="text-on-error-container/80 max-w-md">
              Tap the SOS button to instantly share your location with nearby
              emergency services and your trusted contacts.
            </p>
          </div>
          <button className="w-32 h-32 rounded-full bg-error text-on-error flex flex-col items-center justify-center shadow-xl shadow-error/30 hover:scale-105 active:scale-95 transition-all urgency-pulse">
            <span
              className="material-symbols-outlined text-4xl mb-1"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              sos
            </span>
            <span className="font-bold tracking-widest">SOS</span>
          </button>
        </section>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Active Alerts */}
          <section className="md:col-span-2 space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                warning
              </span>
              Active Alerts Near You
            </h3>
            <div className="space-y-4">
              <div className="bg-surface-container-lowest p-5 rounded-2xl border-l-4 border-tertiary shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-tertiary">Wildfire Warning</h4>
                  <span className="text-xs font-bold bg-tertiary-container text-on-tertiary-container px-2 py-1 rounded-md">
                    5 miles away
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant mb-3">
                  Evacuation order issued for Northridge area. Please follow
                  designated routes.
                </p>
                <button className="text-sm font-bold text-primary flex items-center gap-1 hover:underline">
                  View Map{" "}
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </button>
              </div>
              <div className="bg-surface-container-lowest p-5 rounded-2xl border-l-4 border-secondary shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-secondary">
                    Severe Thunderstorm Watch
                  </h4>
                  <span className="text-xs font-bold bg-secondary-container text-on-secondary-container px-2 py-1 rounded-md">
                    Expected 4:00 PM
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant">
                  High winds and heavy rain expected. Secure loose outdoor
                  items.
                </p>
              </div>
            </div>
          </section>

          {/* Quick Actions & Preparedness */}
          <section className="space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                check_circle
              </span>
              Preparedness
            </h3>
            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl cursor-pointer hover:bg-surface-variant transition-colors">
                <span className="material-symbols-outlined text-primary">
                  medical_services
                </span>
                <div>
                  <h4 className="font-bold text-sm">First Aid Guide</h4>
                  <p className="text-xs text-on-surface-variant">
                    Basic emergency procedures
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl cursor-pointer hover:bg-surface-variant transition-colors">
                <span className="material-symbols-outlined text-primary">
                  route
                </span>
                <div>
                  <h4 className="font-bold text-sm">Evacuation Routes</h4>
                  <p className="text-xs text-on-surface-variant">
                    Saved offline
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl cursor-pointer hover:bg-surface-variant transition-colors">
                <span className="material-symbols-outlined text-primary">
                  contacts
                </span>
                <div>
                  <h4 className="font-bold text-sm">Trusted Contacts</h4>
                  <p className="text-xs text-on-surface-variant">
                    3 contacts configured
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function AgencyDashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex flex-col">
      <header className="bg-inverse-surface text-inverse-on-surface px-6 py-4 flex justify-between items-center shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-inverse-primary text-3xl">
            admin_panel_settings
          </span>
          <div>
            <h1 className="font-headline font-extrabold text-xl tracking-tighter text-inverse-primary">
              RapidAid Admin
            </h1>
            <p className="text-xs opacity-80">Emergency Services Co.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-full hover:bg-on-surface/10 transition-colors">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={onLogout}
          >
            <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold">
              SJ
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-bold">Sarah Jenkins</p>
              <p className="text-xs opacity-80">Sign out</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid lg:grid-cols-4 gap-6">
        {/* Sidebar / Navigation */}
        <aside className="space-y-2">
          <button className="w-full flex items-center gap-3 p-4 bg-primary-container text-on-primary-container font-bold rounded-xl">
            <span className="material-symbols-outlined">dashboard</span>
            Overview
          </button>
          <button className="w-full flex items-center gap-3 p-4 hover:bg-surface-container rounded-xl text-on-surface-variant font-medium transition-colors">
            <span className="material-symbols-outlined">campaign</span>
            Broadcasts
          </button>
          <button className="w-full flex items-center gap-3 p-4 hover:bg-surface-container rounded-xl text-on-surface-variant font-medium transition-colors">
            <span className="material-symbols-outlined">group</span>
            Responders
          </button>
          <button className="w-full flex items-center gap-3 p-4 hover:bg-surface-container rounded-xl text-on-surface-variant font-medium transition-colors">
            <span className="material-symbols-outlined">analytics</span>
            Reports
          </button>
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Stats Row */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30">
              <div className="flex justify-between items-start mb-4">
                <span className="material-symbols-outlined text-error bg-error-container p-2 rounded-lg">
                  warning
                </span>
                <span className="text-xs font-bold text-error">
                  +2 this hour
                </span>
              </div>
              <h3 className="text-3xl font-bold mb-1">14</h3>
              <p className="text-sm text-on-surface-variant">
                Active Emergencies
              </p>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30">
              <div className="flex justify-between items-start mb-4">
                <span className="material-symbols-outlined text-primary bg-primary-container p-2 rounded-lg">
                  local_shipping
                </span>
                <span className="text-xs font-bold text-primary">
                  85% deployed
                </span>
              </div>
              <h3 className="text-3xl font-bold mb-1">42/50</h3>
              <p className="text-sm text-on-surface-variant">
                Units Dispatched
              </p>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30">
              <div className="flex justify-between items-start mb-4">
                <span className="material-symbols-outlined text-secondary bg-secondary-container p-2 rounded-lg">
                  group
                </span>
              </div>
              <h3 className="text-3xl font-bold mb-1">1,204</h3>
              <p className="text-sm text-on-surface-variant">
                Citizens Reached
              </p>
            </div>
          </div>

          {/* Broadcast Action */}
          <section className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <div className="p-5 border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <span className="material-symbols-outlined">campaign</span>
                New Broadcast Alert
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Alert Type
                  </label>
                  <select className="w-full p-3 bg-surface-variant border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm">
                    <option>Evacuation Order</option>
                    <option>Weather Warning</option>
                    <option>Shelter in Place</option>
                    <option>All Clear</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Target Area
                  </label>
                  <select className="w-full p-3 bg-surface-variant border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm">
                    <option>Northridge District</option>
                    <option>Central City</option>
                    <option>All Districts</option>
                    <option>Custom Radius...</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Message
                </label>
                <textarea
                  className="w-full p-3 bg-surface-variant border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm min-h-[100px]"
                  placeholder="Enter emergency instructions here..."
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button className="px-6 py-2.5 rounded-xl font-bold text-primary hover:bg-primary/10 transition-colors">
                  Save Draft
                </button>
                <button className="px-6 py-2.5 rounded-xl font-bold bg-error text-on-error shadow-md hover:bg-error/90 transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">
                    send
                  </span>
                  Send Alert Now
                </button>
              </div>
            </div>
          </section>

          {/* Recent Activity */}
          <section className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30">
            <div className="p-5 border-b border-outline-variant/30">
              <h2 className="font-bold text-lg">Recent Activity</h2>
            </div>
            <div className="divide-y divide-outline-variant/20">
              <div className="p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center">
                    <span className="material-symbols-outlined">sos</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">SOS Signal Received</p>
                    <p className="text-xs text-on-surface-variant">
                      Unit 4 dispatched to 123 Main St.
                    </p>
                  </div>
                </div>
                <span className="text-xs text-on-surface-variant">
                  2 min ago
                </span>
              </div>
              <div className="p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center">
                    <span className="material-symbols-outlined">campaign</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">
                      Broadcast Sent: Wildfire Warning
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Reached 850 citizens in Northridge.
                    </p>
                  </div>
                </div>
                <span className="text-xs text-on-surface-variant">
                  15 min ago
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
