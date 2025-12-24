// components/pages/SubSuperadminManagementPage.jsx

import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiKey, FiX, FiSave, FiEye, FiEyeOff } from 'react-icons/fi';
import subSuperAdminService from '../../services/subSuperAdminService';

const SubSuperadminManagementPage = () => {
  const [subSuperAdmins, setSubSuperAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSubSuperAdmin, setSelectedSubSuperAdmin] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    accessControls: {
      canViewDashboard: true,
      canViewTransactions: true,
      canManageTransactions: true,
      canSettleTransactions: true,
      canViewPayouts: true,
      canApprovePayouts: true,
      canRejectPayouts: true,
      canProcessPayouts: true,
      canViewMerchants: true,
      canManageMerchants: true,
      canDeleteMerchants: false,
      canBlockMerchantFunds: true,
      canChangeMerchantPassword: true,
      canViewAdmins: true,
      canCreateAdmins: true,
      canEditAdmins: true,
      canDeleteAdmins: true,
      canViewSettings: true,
      canManageSettings: false,
      canManageSubSuperAdmins: false,
    }
  });
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadSubSuperAdmins();
  }, []);

  const loadSubSuperAdmins = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await subSuperAdminService.getAllSubSuperAdmins();
      setSubSuperAdmins(response.subSuperAdmins || []);
    } catch (err) {
      setError(err.message || 'Failed to load sub-superadmins');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      accessControls: {
        canViewDashboard: true,
        canViewTransactions: true,
        canManageTransactions: true,
        canSettleTransactions: true,
        canViewPayouts: true,
        canApprovePayouts: true,
        canRejectPayouts: true,
        canProcessPayouts: true,
        canViewMerchants: true,
        canManageMerchants: true,
        canDeleteMerchants: false,
        canBlockMerchantFunds: true,
        canChangeMerchantPassword: true,
        canViewAdmins: true,
        canCreateAdmins: true,
        canEditAdmins: true,
        canDeleteAdmins: true,
        canViewSettings: true,
        canManageSettings: false,
        canManageSubSuperAdmins: false,
      }
    });
    setError('');
    setSuccess('');
    setShowCreateModal(true);
  };

  const handleEdit = (subSuperAdmin) => {
    setSelectedSubSuperAdmin(subSuperAdmin);
    setFormData({
      name: subSuperAdmin.name,
      email: subSuperAdmin.email,
      password: '',
      confirmPassword: '',
      accessControls: subSuperAdmin.accessControls || {}
    });
    setError('');
    setSuccess('');
    setShowEditModal(true);
  };

  const handleView = (subSuperAdmin) => {
    setSelectedSubSuperAdmin(subSuperAdmin);
    setShowViewModal(true);
  };

  const handlePasswordChange = (subSuperAdmin) => {
    setSelectedSubSuperAdmin(subSuperAdmin);
    setPasswordData({ newPassword: '', confirmPassword: '' });
    setError('');
    setSuccess('');
    setShowPasswordModal(true);
  };

  const handleDelete = async (subSuperAdmin) => {
    if (!window.confirm(`Are you sure you want to delete ${subSuperAdmin.name}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await subSuperAdminService.deleteSubSuperAdmin(subSuperAdmin._id);
      setSuccess('Sub-superadmin deleted successfully');
      await loadSubSuperAdmins();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete sub-superadmin');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('Name, email, and password are required');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await subSuperAdminService.createSubSuperAdmin({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        accessControls: formData.accessControls
      });
      setSuccess('Sub-superadmin created successfully');
      setShowCreateModal(false);
      await loadSubSuperAdmins();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to create sub-superadmin');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      return;
    }

    setLoading(true);
    try {
      await subSuperAdminService.updateSubSuperAdmin(selectedSubSuperAdmin._id, {
        name: formData.name,
        email: formData.email,
        accessControls: formData.accessControls
      });
      setSuccess('Sub-superadmin updated successfully');
      setShowEditModal(false);
      await loadSubSuperAdmins();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update sub-superadmin');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await subSuperAdminService.changeSubSuperAdminPassword(
        selectedSubSuperAdmin._id,
        passwordData.newPassword
      );
      setSuccess('Password changed successfully');
      setShowPasswordModal(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const toggleAccessControl = (key) => {
    setFormData(prev => ({
      ...prev,
      accessControls: {
        ...prev.accessControls,
        [key]: !prev.accessControls[key]
      }
    }));
  };

  const AccessControlSection = ({ title, permissions }) => (
    <div className="mb-6">
      <h4 className="text-white font-medium mb-3 font-['Albert_Sans']">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {permissions.map(perm => (
          <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.accessControls[perm.key] || false}
              onChange={() => toggleAccessControl(perm.key)}
              className="w-4 h-4 rounded border-white/20 bg-[#263F43] text-accent focus:ring-accent"
            />
            <span className="text-white/80 text-sm font-['Albert_Sans']">{perm.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#001D22]">
      {/* Fixed X Graphic - Background Layer */}
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none z-0"
        style={{ top: "4rem" }}
      >
        <img
          src="/X.png"
          alt="X graphic"
          className="object-contain hidden sm:block"
          style={{
            filter: "drop-shadow(0 0 40px rgba(94, 234, 212, 0.5))",
            width: "120%",
            height: "85%",
            maxWidth: "none",
            maxHeight: "none",
          }}
        />
      </div>

      {/* Scrollable Content Section */}
      <section className="relative z-10 min-h-screen bg-transparent">
        <div className="h-[calc(50vh-4rem)] sm:h-[calc(55vh-4rem)]"></div>

        <div className="bg-transparent pt-2 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6">
              {/* Header */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-white mb-2 font-['Albert_Sans']">
                    Sub-SuperAdmin Management
                  </h1>
                  <p className="text-white/70 text-xs sm:text-sm font-['Albert_Sans']">
                    Create and manage sub-superadmin accounts with custom access controls
                  </p>
                </div>
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2 rounded-lg text-sm font-medium font-['Albert_Sans'] transition-all duration-200"
                >
                  <FiPlus /> Create Sub-SuperAdmin
                </button>
              </div>

              {/* Messages */}
              {error && (
                <div className="mb-4 text-red-400 bg-red-500/20 border border-red-500/40 rounded-lg p-4 flex items-center gap-2 font-['Albert_Sans']">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 text-green-400 bg-green-500/20 border border-green-500/40 rounded-lg p-4 flex items-center gap-2 font-['Albert_Sans']">
                  {success}
                </div>
              )}

              {/* Table */}
              {loading && !subSuperAdmins.length ? (
                <div className="flex flex-col items-center justify-center py-20 px-5">
                  <div className="w-10 h-10 border-4 border-white/30 border-t-accent rounded-full animate-spin mb-5"></div>
                  <p className="text-white/80 font-['Albert_Sans']">Loading sub-superadmins...</p>
                </div>
              ) : (
                <div className="bg-[#263F43] border border-white/10 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#001D22] border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase">Email</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase hidden md:table-cell">Status</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase hidden lg:table-cell">Created</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subSuperAdmins.map((admin) => (
                          <tr key={admin._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-white font-medium text-sm font-['Albert_Sans']">{admin.name}</td>
                            <td className="px-4 py-3 text-white/70 text-sm font-['Albert_Sans']">{admin.email}</td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium font-['Albert_Sans'] ${
                                admin.status === 'active' 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : admin.status === 'suspended'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {admin.status || 'active'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-white/60 text-xs font-['Albert_Sans'] hidden lg:table-cell">
                              {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleView(admin)}
                                  className="p-2 bg-accent/20 hover:bg-accent/30 border border-accent/30 rounded-lg text-accent transition-all"
                                  title="View Details"
                                >
                                  <FiEye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEdit(admin)}
                                  className="p-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 transition-all"
                                  title="Edit"
                                >
                                  <FiEdit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handlePasswordChange(admin)}
                                  className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-lg text-yellow-400 transition-all"
                                  title="Change Password"
                                >
                                  <FiKey className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(admin)}
                                  className="p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 transition-all"
                                  title="Delete"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {subSuperAdmins.length === 0 && (
                      <div className="text-center py-12 text-white/60 font-['Albert_Sans']">
                        No sub-superadmins found. Create one to get started.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#122D32] border border-white/10 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#122D32] z-10">
              <h3 className="text-xl font-semibold text-white font-['Albert_Sans']">Create Sub-SuperAdmin</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitCreate} className="p-6">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2 font-['Albert_Sans']">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent font-['Albert_Sans']"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2 font-['Albert_Sans']">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent font-['Albert_Sans']"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2 font-['Albert_Sans']">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent font-['Albert_Sans']"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2 font-['Albert_Sans']">Confirm Password *</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent font-['Albert_Sans']"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {/* Access Controls */}
              <div className="border-t border-white/10 pt-6">
                <h4 className="text-white font-medium mb-4 font-['Albert_Sans']">Access Controls</h4>
                <AccessControlSection
                  title="Dashboard & Overview"
                  permissions={[
                    { key: 'canViewDashboard', label: 'View Dashboard' }
                  ]}
                />
                <AccessControlSection
                  title="Transactions"
                  permissions={[
                    { key: 'canViewTransactions', label: 'View Transactions' },
                    { key: 'canManageTransactions', label: 'Manage Transactions' },
                    { key: 'canSettleTransactions', label: 'Settle Transactions' }
                  ]}
                />
                <AccessControlSection
                  title="Payouts"
                  permissions={[
                    { key: 'canViewPayouts', label: 'View Payouts' },
                    { key: 'canApprovePayouts', label: 'Approve Payouts' },
                    { key: 'canRejectPayouts', label: 'Reject Payouts' },
                    { key: 'canProcessPayouts', label: 'Process Payouts' }
                  ]}
                />
                <AccessControlSection
                  title="Merchants"
                  permissions={[
                    { key: 'canViewMerchants', label: 'View Merchants' },
                    { key: 'canManageMerchants', label: 'Manage Merchants' },
                    { key: 'canDeleteMerchants', label: 'Delete Merchants' },
                    { key: 'canBlockMerchantFunds', label: 'Block/Unblock Funds' },
                    { key: 'canChangeMerchantPassword', label: 'Change Merchant Password' }
                  ]}
                />
                <AccessControlSection
                  title="Admin Management"
                  permissions={[
                    { key: 'canViewAdmins', label: 'View Admins' },
                    { key: 'canCreateAdmins', label: 'Create Admins' },
                    { key: 'canEditAdmins', label: 'Edit Admins' },
                    { key: 'canDeleteAdmins', label: 'Delete Admins' }
                  ]}
                />
                <AccessControlSection
                  title="Settings"
                  permissions={[
                    { key: 'canViewSettings', label: 'View Settings' },
                    { key: 'canManageSettings', label: 'Manage Settings' }
                  ]}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2.5 rounded-lg text-sm font-medium font-['Albert_Sans'] transition-all disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Sub-SuperAdmin'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-[#263F43] hover:bg-[#2a4a4f] border border-white/10 text-white rounded-lg text-sm font-medium font-['Albert_Sans']"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal - Similar structure but without password fields */}
      {showEditModal && selectedSubSuperAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#122D32] border border-white/10 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#122D32] z-10">
              <h3 className="text-xl font-semibold text-white font-['Albert_Sans']">Edit Sub-SuperAdmin</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitEdit} className="p-6">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2 font-['Albert_Sans']">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent font-['Albert_Sans']"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2 font-['Albert_Sans']">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent font-['Albert_Sans']"
                    required
                  />
                </div>
              </div>

              {/* Access Controls - Same as create */}
              <div className="border-t border-white/10 pt-6">
                <h4 className="text-white font-medium mb-4 font-['Albert_Sans']">Access Controls</h4>
                <AccessControlSection
                  title="Dashboard & Overview"
                  permissions={[
                    { key: 'canViewDashboard', label: 'View Dashboard' }
                  ]}
                />
                <AccessControlSection
                  title="Transactions"
                  permissions={[
                    { key: 'canViewTransactions', label: 'View Transactions' },
                    { key: 'canManageTransactions', label: 'Manage Transactions' },
                    { key: 'canSettleTransactions', label: 'Settle Transactions' }
                  ]}
                />
                <AccessControlSection
                  title="Payouts"
                  permissions={[
                    { key: 'canViewPayouts', label: 'View Payouts' },
                    { key: 'canApprovePayouts', label: 'Approve Payouts' },
                    { key: 'canRejectPayouts', label: 'Reject Payouts' },
                    { key: 'canProcessPayouts', label: 'Process Payouts' }
                  ]}
                />
                <AccessControlSection
                  title="Merchants"
                  permissions={[
                    { key: 'canViewMerchants', label: 'View Merchants' },
                    { key: 'canManageMerchants', label: 'Manage Merchants' },
                    { key: 'canDeleteMerchants', label: 'Delete Merchants' },
                    { key: 'canBlockMerchantFunds', label: 'Block/Unblock Funds' },
                    { key: 'canChangeMerchantPassword', label: 'Change Merchant Password' }
                  ]}
                />
                <AccessControlSection
                  title="Admin Management"
                  permissions={[
                    { key: 'canViewAdmins', label: 'View Admins' },
                    { key: 'canCreateAdmins', label: 'Create Admins' },
                    { key: 'canEditAdmins', label: 'Edit Admins' },
                    { key: 'canDeleteAdmins', label: 'Delete Admins' }
                  ]}
                />
                <AccessControlSection
                  title="Settings"
                  permissions={[
                    { key: 'canViewSettings', label: 'View Settings' },
                    { key: 'canManageSettings', label: 'Manage Settings' }
                  ]}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2.5 rounded-lg text-sm font-medium font-['Albert_Sans'] transition-all disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Sub-SuperAdmin'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 bg-[#263F43] hover:bg-[#2a4a4f] border border-white/10 text-white rounded-lg text-sm font-medium font-['Albert_Sans']"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && selectedSubSuperAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#122D32] border border-white/10 rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-xl font-semibold text-white font-['Albert_Sans']">Change Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitPassword} className="p-6">
              <p className="text-white/80 mb-4 font-['Albert_Sans']">
                Change password for <span className="font-semibold text-white">{selectedSubSuperAdmin.email}</span>
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2 font-['Albert_Sans']">New Password *</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent font-['Albert_Sans']"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2 font-['Albert_Sans']">Confirm Password *</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent font-['Albert_Sans']"
                    required
                    minLength={6}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-[#263F43] text-accent"
                  />
                  <label className="text-white/70 text-sm font-['Albert_Sans']">Show password</label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2.5 rounded-lg text-sm font-medium font-['Albert_Sans'] transition-all disabled:opacity-50"
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2.5 bg-[#263F43] hover:bg-[#2a4a4f] border border-white/10 text-white rounded-lg text-sm font-medium font-['Albert_Sans']"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedSubSuperAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#122D32] border border-white/10 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#122D32] z-10">
              <h3 className="text-xl font-semibold text-white font-['Albert_Sans']">Sub-SuperAdmin Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-white/70 text-sm font-['Albert_Sans']">Name</label>
                <p className="text-white font-medium font-['Albert_Sans']">{selectedSubSuperAdmin.name}</p>
              </div>
              <div>
                <label className="text-white/70 text-sm font-['Albert_Sans']">Email</label>
                <p className="text-white font-medium font-['Albert_Sans']">{selectedSubSuperAdmin.email}</p>
              </div>
              <div>
                <label className="text-white/70 text-sm font-['Albert_Sans']">Status</label>
                <p className="text-white font-medium font-['Albert_Sans']">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedSubSuperAdmin.status === 'active' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {selectedSubSuperAdmin.status || 'active'}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-white/70 text-sm font-['Albert_Sans']">Created At</label>
                <p className="text-white font-medium font-['Albert_Sans']">
                  {selectedSubSuperAdmin.createdAt ? new Date(selectedSubSuperAdmin.createdAt).toLocaleString() : '-'}
                </p>
              </div>
              {selectedSubSuperAdmin.createdBy && (
                <div>
                  <label className="text-white/70 text-sm font-['Albert_Sans']">Created By</label>
                  <p className="text-white font-medium font-['Albert_Sans']">
                    {selectedSubSuperAdmin.createdBy.name || selectedSubSuperAdmin.createdBy.email || '-'}
                  </p>
                </div>
              )}
              <div className="border-t border-white/10 pt-4">
                <label className="text-white/70 text-sm font-['Albert_Sans'] mb-2 block">Access Controls</label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedSubSuperAdmin.accessControls && Object.entries(selectedSubSuperAdmin.accessControls).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${value ? 'bg-green-400' : 'bg-red-400'}`}></span>
                      <span className="text-white/80 text-xs font-['Albert_Sans']">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubSuperadminManagementPage;

