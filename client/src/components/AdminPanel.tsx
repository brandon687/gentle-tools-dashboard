import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Shield, UserCheck, UserX, Crown, Loader2, Users, Eye, Calendar, Hash, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  admins: number;
  powerUsers: number;
}

interface UserActivityStats {
  userId: number;
  userEmail: string;
  totalImeisDumped: number;
  totalImeisDeleted: number;
  totalLogins: number;
  totalSyncsTriggered: number;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
}

interface ActivityLogEntry {
  id: string;
  userId: number;
  userEmail: string;
  activityType: string;
  resourceType: string | null;
  resourceId: string | null;
  itemCount: number | null;
  metadata: any;
  ipAddress: string | null;
  userAgent: string | null;
  performedAt: string;
}

export default function AdminPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'role' | 'status' | null>(null);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<User | null>(null);
  const [copiedActivityId, setCopiedActivityId] = useState<string | null>(null);

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch user stats
  const { data: stats } = useQuery<UserStats>({
    queryKey: ['/api/users/stats'],
    refetchInterval: 30000,
  });

  // Fetch activity stats for all users
  const { data: activityStats = [] } = useQuery<UserActivityStats[]>({
    queryKey: ['/api/activity/stats'],
    refetchInterval: 30000,
  });

  // Helper to get activity stats for a specific user
  const getUserActivity = (userId: number) => {
    return activityStats.find(stat => stat.userId === userId) || {
      totalImeisDumped: 0,
      totalImeisDeleted: 0,
      totalLogins: 0,
    };
  };

  // Fetch recent activity for selected user
  const { data: recentActivity = [], isLoading: activityLoading } = useQuery<ActivityLogEntry[]>({
    queryKey: ['/api/activity/recent', selectedUserForActivity?.id],
    enabled: !!selectedUserForActivity && activityDialogOpen,
  });

  const handleViewActivity = (user: User) => {
    setSelectedUserForActivity(user);
    setActivityDialogOpen(true);
  };

  const handleCopyImeis = async (imeis: string[], activityId: string) => {
    try {
      const imeiText = imeis.join('\n');
      await navigator.clipboard.writeText(imeiText);
      setCopiedActivityId(activityId);
      toast({
        title: 'Copied!',
        description: `${imeis.length} IMEIs copied to clipboard`,
        duration: 2000,
      });

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedActivityId(null);
      }, 2000);
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy IMEIs to clipboard',
        variant: 'destructive',
      });
    }
  };

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update role');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/stats'] });
      toast({
        title: 'Role Updated',
        description: 'User role has been successfully updated.',
      });
      setSelectedUser(null);
      setActionType(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update user status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number; isActive: boolean }) => {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update status');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/stats'] });
      toast({
        title: 'Status Updated',
        description: 'User status has been successfully updated.',
      });
      setSelectedUser(null);
      setActionType(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleRoleChange = (userId: number, newRole: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setActionType('role');
      updateRoleMutation.mutate({ userId, role: newRole });
    }
  };

  const handleStatusToggle = (user: User) => {
    setSelectedUser(user);
    setActionType('status');
  };

  const confirmStatusChange = () => {
    if (selectedUser) {
      updateStatusMutation.mutate({
        userId: selectedUser.id,
        isActive: !selectedUser.isActive,
      });
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <Badge className="bg-purple-600 hover:bg-purple-700">
          <Crown className="w-3 h-3 mr-1" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Shield className="w-3 h-3 mr-1" />
        Power User
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge variant="outline" className="bg-green-950 text-green-400 border-green-800">
          <UserCheck className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-950 text-red-400 border-red-800">
        <UserX className="w-3 h-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-green-400" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-400" />
                Inactive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{stats.inactive}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Crown className="w-4 h-4 text-purple-400" />
                Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{stats.admins}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                Power Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{stats.powerUsers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Management Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user roles and access permissions. Power Users can access Physical Inventory, Pending Outbound, and Dump IMEI tabs.
            Admins have full access to all features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IMEIs Dumped</TableHead>
                  <TableHead>IMEIs Deleted</TableHead>
                  <TableHead>Total Logins</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const activity = getUserActivity(user.id);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.name || '—'}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.isActive)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 hover:bg-blue-950/50"
                          onClick={() => handleViewActivity(user)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-blue-400">
                              {activity.totalImeisDumped.toLocaleString()}
                            </span>
                            <Eye className="w-4 h-4 text-blue-400/50" />
                          </div>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 hover:bg-orange-950/50"
                          onClick={() => handleViewActivity(user)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-orange-400">
                              {activity.totalImeisDeleted.toLocaleString()}
                            </span>
                            <Eye className="w-4 h-4 text-orange-400/50" />
                          </div>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 hover:bg-green-950/50"
                          onClick={() => handleViewActivity(user)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-green-400">
                              {activity.totalLogins.toLocaleString()}
                            </span>
                            <Eye className="w-4 h-4 text-green-400/50" />
                          </div>
                        </Button>
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt
                          ? format(new Date(user.lastLoginAt), 'MMM d, yyyy h:mm a')
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleRoleChange(user.id, value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="power_user">Power User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant={user.isActive ? 'destructive' : 'default'}
                            size="sm"
                            onClick={() => handleStatusToggle(user)}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={actionType === 'status' && selectedUser !== null}
        onOpenChange={() => {
          setSelectedUser(null);
          setActionType(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.isActive ? 'Deactivate User' : 'Activate User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.isActive
                ? `Are you sure you want to deactivate ${selectedUser?.email}? They will no longer be able to access the dashboard.`
                : `Are you sure you want to activate ${selectedUser?.email}? They will regain access to the dashboard.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activity Details Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Activity Details: {selectedUserForActivity?.email}
            </DialogTitle>
            <DialogDescription>
              Recent IMEI operations and activity log
            </DialogDescription>
          </DialogHeader>

          {activityLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No activity recorded yet
                  </div>
                ) : (
                  recentActivity.map((activity) => (
                    <Card key={activity.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          {/* Activity Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={
                                  activity.activityType === 'imei_dump_add' ? 'default' :
                                  activity.activityType === 'imei_dump_delete' ? 'destructive' :
                                  activity.activityType === 'imei_dump_clear' ? 'secondary' :
                                  'outline'
                                }>
                                  {activity.activityType.replace(/_/g, ' ').toUpperCase()}
                                </Badge>
                                {activity.itemCount !== null && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Hash className="w-3 h-3" />
                                    {activity.itemCount.toLocaleString()} IMEIs
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(activity.performedAt), 'MMM d, yyyy h:mm:ss a')}
                              </div>
                            </div>
                          </div>

                          {/* IMEI List */}
                          {activity.metadata?.imeis && activity.metadata.imeis.length > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium">IMEIs:</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCopyImeis(activity.metadata.imeis, activity.id)}
                                  className="h-7 text-xs"
                                >
                                  {copiedActivityId === activity.id ? (
                                    <>
                                      <Check className="w-3 h-3 mr-1" />
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 mr-1" />
                                      Copy All ({activity.metadata.imeis.length})
                                    </>
                                  )}
                                </Button>
                              </div>
                              <div className="bg-muted rounded-md p-3 max-h-40 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                  {activity.metadata.imeis.slice(0, 100).map((imei: string, idx: number) => (
                                    <div key={idx} className="text-muted-foreground">
                                      {imei}
                                    </div>
                                  ))}
                                  {activity.metadata.imeis.length > 100 && (
                                    <div className="col-span-2 text-center text-muted-foreground italic">
                                      ... and {activity.metadata.imeis.length - 100} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Single IMEI for delete */}
                          {activity.activityType === 'imei_dump_delete' && activity.metadata?.imei && (
                            <div>
                              <p className="text-sm font-medium mb-2">IMEI:</p>
                              <div className="bg-muted rounded-md p-3">
                                <code className="text-sm font-mono">{activity.metadata.imei}</code>
                              </div>
                            </div>
                          )}

                          {/* IP Address and User Agent */}
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            {activity.ipAddress && (
                              <div>
                                <p className="text-muted-foreground mb-1">IP Address:</p>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {activity.ipAddress}
                                </code>
                              </div>
                            )}
                            {activity.userAgent && (
                              <div>
                                <p className="text-muted-foreground mb-1">User Agent:</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {activity.userAgent}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
