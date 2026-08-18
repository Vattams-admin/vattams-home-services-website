{/* Mobile account + menu controls */}
<div className="md:hidden flex items-center gap-2">
  <button
    type="button"
    onClick={() => setMobileOpen(true)}
    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm"
    aria-label="Open Account menu"
  >
    <User size={16} aria-hidden="true" />
    <span>Account</span>
  </button>

  <button
    className="p-2 rounded-lg text-gray-700 hover:bg-blue-50"
    onClick={() => setMobileOpen(!mobileOpen)}
    aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
    aria-expanded={mobileOpen}
  >
    {mobileOpen ? (
      <X size={22} aria-hidden="true" />
    ) : (
      <Menu size={22} aria-hidden="true" />
    )}
  </button>
</div>