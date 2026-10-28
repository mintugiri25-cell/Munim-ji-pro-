import React, { useState } from 'react';
import { BusinessProfile, UserProfile } from '../types/accounting';
import { exportBackupToFile, importBackupFromFile } from '../db/storage';
import {
  Smartphone,
  Shield,
  Download,
  Upload,
  Building,
  Key,
  Copy,
  Check,
  Apple,
  ExternalLink,
  Info,
} from 'lucide-react';

interface Props {
  profile: BusinessProfile;
  currentUser: UserProfile;
  appState: any;
  onUpdateProfile: (profile: BusinessProfile) => void;
  onRestoreState: (state: any) => void;
  onSwitchToRealData: () => void;
}

export const SettingsMobileView: React.FC<Props> = ({
  profile,
  currentUser,
  appState,
  onUpdateProfile,
  onRestoreState,
  onSwitchToRealData,
}) => {
  const [shopName, setShopName] = useState(profile.shopName);
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [contactNumber, setContactNumber] = useState(profile.contactNumber);
  const [address, setAddress] = useState(profile.address);
  const [taxNumber, setTaxNumber] = useState(profile.taxNumber || '');
  const [currencySymbol, setCurrencySymbol] = useState(profile.currencySymbol);
  const [financialYearStart, setFinancialYearStart] = useState(profile.financialYearStart);

  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      shopName,
      ownerName,
      contactNumber,
      address,
      taxNumber,
      currencySymbol,
      financialYearStart,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const restored = importBackupFromFile(content);
        onRestoreState(restored);
        alert('Backup successfully restored!');
      } catch (err: any) {
        alert(`Failed to restore backup: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900">
          Settings, Security & Mobile Build Center
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Business profile, local backups, Android release APK, Play Store AAB aur iOS TestFlight deployment
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Profile Editor */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
            <Building className="w-5 h-5 text-slate-900" />
            <h3 className="font-bold text-slate-900 text-sm">Business Profile & Bill Header</h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Shop / Dukan / Firm Ka Naam *
              </label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Owner / Malik Ka Naam *
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contact Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Business Pata (Address on Invoices)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  GSTIN / Tax ID (Optional)
                </label>
                <input
                  type="text"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Financial Year Start Date
              </label>
              <input
                type="date"
                value={financialYearStart}
                onChange={(e) => setFinancialYearStart(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              {saveSuccess && (
                <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                  <Check className="w-4 h-4" />
                  <span>Profile Saved Successfully!</span>
                </span>
              )}
              <button
                type="submit"
                className="ml-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition cursor-pointer"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>

        {/* Local Backup & Data Safety */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
            <Download className="w-5 h-5 text-slate-900" />
            <h3 className="font-bold text-slate-900 text-sm">Backup, Restore & Data Portability</h3>
          </div>

          <p className="text-xs text-slate-600">
            Aapka data puri tarah aapke device par offline surakshit rehta hai. Kisi bhi samay poore hisaab-kitaab ka encrypted backup JSON file mein download kar sakte hain aur doosre device par restore kar sakte hain.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => exportBackupToFile(appState)}
              className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <Download className="w-5 h-5 text-emerald-600" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Instant
                </span>
              </div>
              <div className="mt-3">
                <h4 className="text-xs font-bold text-slate-900">Download JSON Backup</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Save all ledgers, parties, and stock to file
                </p>
              </div>
            </button>

            <label className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition cursor-pointer flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Upload className="w-5 h-5 text-blue-600" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Restore
                </span>
              </div>
              <div className="mt-3">
                <h4 className="text-xs font-bold text-slate-900">Restore Backup File</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select and upload a MunimJi JSON backup
                </p>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Sample Data Switcher */}
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Real Blank Ledger Mode</h4>
              <p className="text-[11px] text-slate-500">
                Purge demo records and start fresh accounting for your actual store
              </p>
            </div>
            <button
              onClick={onSwitchToRealData}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition"
            >
              Start Blank Ledger
            </button>
          </div>
        </div>
      </div>

      {/* Android & iOS Native Build Hub (Requirement 2) */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <span>Android APK/AAB & iPhone iOS Native Build Instructions</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Capacitor 6 cross-platform build pipeline with complete signing guide
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 bg-slate-800 text-emerald-400 rounded-full border border-slate-700">
            Capacitor Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Android Column */}
          <div className="space-y-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold">
              <span>Android Build (Release APK & Play Store AAB)</span>
            </div>
            <p className="text-slate-300">
              Direct installable signed APK kisi bhi Android smartphone par bina Play Store ke install ho sakta hai.
            </p>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                1. Keystore Signing Key Generate Karein (One-Time):
              </span>
              <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[11px] text-slate-300 flex items-center justify-between">
                <span className="truncate mr-2">
                  keytool -genkey -v -keystore release.jks -alias munimji -keyalg RSA -keysize 2048 -validity 10000
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      'keytool -genkey -v -keystore release.jks -alias munimji -keyalg RSA -keysize 2048 -validity 10000',
                      'keytool'
                    )
                  }
                  className="p-1 hover:text-white"
                >
                  {copiedCmd === 'keytool' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block pt-1">
                2. Signed Release APK Build (Direct Phone Install):
              </span>
              <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[11px] text-slate-300 flex items-center justify-between">
                <span>npm run build && npx cap sync android && cd android && ./gradlew assembleRelease</span>
                <button
                  onClick={() =>
                    handleCopy(
                      'npm run build && npx cap sync android && cd android && ./gradlew assembleRelease',
                      'apk'
                    )
                  }
                  className="p-1 hover:text-white"
                >
                  {copiedCmd === 'apk' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block pt-1">
                3. Play Store Bundle (.AAB):
              </span>
              <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[11px] text-slate-300 flex items-center justify-between">
                <span>cd android && ./gradlew bundleRelease</span>
                <button
                  onClick={() => handleCopy('cd android && ./gradlew bundleRelease', 'aab')}
                  className="p-1 hover:text-white"
                >
                  {copiedCmd === 'aab' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* iOS Column */}
          <div className="space-y-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
            <div className="flex items-center space-x-2 text-sky-400 font-bold">
              <Apple className="w-4 h-4" />
              <span>iPhone / iOS Build & TestFlight Setup</span>
            </div>
            <p className="text-slate-300">
              Apple security guidelines ke mutabik Android APK iPhone par nahi chal sakti. iOS ke liye alag signed build aur Xcode zaroori hai.
            </p>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                1. Sync to iOS Native Platform:
              </span>
              <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[11px] text-slate-300 flex items-center justify-between">
                <span>npm run build && npx cap sync ios && npx cap open ios</span>
                <button
                  onClick={() =>
                    handleCopy('npm run build && npx cap sync ios && npx cap open ios', 'ios_sync')
                  }
                  className="p-1 hover:text-white"
                >
                  {copiedCmd === 'ios_sync' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block pt-1">
                2. Requirements for iPhone:
              </span>
              <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                <li>macOS computer with Xcode 15+</li>
                <li>Apple Developer Account ($99/year) signing credentials</li>
                <li>Archive in Xcode -&gt; Distribute to TestFlight for beta testers</li>
                <li>Instant PWA Alternative: Safari mein kholkar "Add to Home Screen" karein</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
