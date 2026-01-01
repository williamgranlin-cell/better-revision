import { useState, useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Users, Crown, User, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface UserWithRole {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "free" | "premium" | "admin";
}

const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, loading: subLoading } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!subLoading && !isAdmin) {
      navigate("/profile");
    }
  }, [isAdmin, subLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles (admin can see all)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email");

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          role: (userRole?.role as "free" | "premium" | "admin") || "free",
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: "free" | "premium" | "admin") => {
    if (userId === user?.id) {
      toast({
        title: "Action interdite",
        description: "Vous ne pouvez pas modifier votre propre rôle",
        variant: "destructive",
      });
      return;
    }

    setUpdating(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      toast({
        title: "Rôle mis à jour",
        description: `L'utilisateur a été passé en ${newRole}`,
      });
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le rôle",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-destructive text-destructive-foreground">Admin</Badge>;
      case "premium":
        return <Badge className="bg-primary text-primary-foreground">Premium</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4 text-destructive" />;
      case "premium":
        return <Crown className="h-4 w-4 text-primary" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (subLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Panel Admin</h1>
            <p className="text-sm text-muted-foreground">
              Gérer les utilisateurs et leurs rôles
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{users.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Crown className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">
                {users.filter((u) => u.role === "premium").length}
              </div>
              <div className="text-xs text-muted-foreground">Premium</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Shield className="h-6 w-6 mx-auto mb-2 text-destructive" />
              <div className="text-2xl font-bold">
                {users.filter((u) => u.role === "admin").length}
              </div>
              <div className="text-xs text-muted-foreground">Admins</div>
            </CardContent>
          </Card>
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Utilisateurs ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {users.map((userItem) => (
                  <Card key={userItem.id} className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          {getRoleIcon(userItem.role)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {userItem.first_name} {userItem.last_name}
                            {userItem.id === user?.id && (
                              <span className="text-xs text-muted-foreground ml-2">(vous)</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {userItem.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getRoleBadge(userItem.role)}
                        {userItem.id !== user?.id && userItem.role !== "admin" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateUserRole(userItem.id, "admin")}
                            disabled={updating === userItem.id}
                          >
                            {updating === userItem.id ? "..." : "→ Admin"}
                          </Button>
                        )}
                        {userItem.id !== user?.id && userItem.role === "admin" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateUserRole(userItem.id, "free")}
                            disabled={updating === userItem.id}
                          >
                            {updating === userItem.id ? "..." : "→ Free"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Admin;