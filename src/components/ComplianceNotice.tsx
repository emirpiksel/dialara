import React from 'react';
import { Shield, Check, AlertTriangle } from 'lucide-react';

interface ComplianceNoticeProps {
  onAccept?: () => void;
  onDecline?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export function ComplianceNotice({ onAccept, onDecline, showActions = false, compact = false }: ComplianceNoticeProps) {
  if (compact) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">GDPR/KVKK Compliant</p>
            <p>All data is encrypted and processed in accordance with privacy regulations.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-start space-x-3">
        <Shield className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Privacy & Data Protection Notice
          </h3>
          
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">GDPR & KVKK Compliance</h4>
              <p>
                Dialara is fully compliant with the General Data Protection Regulation (GDPR) and 
                Turkey's Personal Data Protection Law (KVKK). We are committed to protecting your 
                privacy and ensuring the security of all personal data.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>All data encrypted at rest and in transit</span>
                </div>
                <div className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>EU-based data storage and processing</span>
                </div>
                <div className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Right to data portability and deletion</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Consent-based data processing</span>
                </div>
                <div className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Regular security audits and updates</span>
                </div>
                <div className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Data Processing Agreement (DPA) available</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="font-medium text-amber-800">Consent Requirements</h5>
                  <p className="text-amber-700 mt-1">
                    When uploading contact data or recording calls, you must have explicit consent 
                    from all individuals. This includes consent to contact them and, where applicable, 
                    consent to record conversations.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Your Rights</h4>
              <p>
                Under GDPR and KVKK, you have the right to access, rectify, erase, or port your data. 
                You can also object to processing or request restrictions. For any privacy-related 
                requests, contact us at{' '}
                <a href="mailto:privacy@dialara.com" className="text-blue-600 hover:text-blue-800">
                  privacy@dialara.com
                </a>
              </p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Call Recording Notice</h4>
              <p>
                All calls processed through Dialara may be recorded for training and quality purposes. 
                Recordings are stored securely and automatically deleted after 90 days unless 
                specifically retained for compliance purposes.
              </p>
            </div>
          </div>

          {showActions && (
            <div className="flex space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={onAccept}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                I Understand & Agree
              </button>
              <button
                onClick={onDecline}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
              >
                I Need More Information
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConsentCheckbox({ 
  checked, 
  onChange, 
  label,
  required = false 
}: { 
  checked: boolean; 
  onChange: (checked: boolean) => void;
  label?: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
        required={required}
      />
      <div className="text-sm">
        <label className="text-gray-700">
          {label || (
            <>
              I confirm that I have obtained explicit consent from all individuals whose data I am uploading, 
              including consent to contact them and record calls where applicable. I understand that this 
              data will be processed in accordance with GDPR and KVKK regulations.
              {required && <span className="text-red-500 ml-1">*</span>}
            </>
          )}
        </label>
      </div>
    </div>
  );
}