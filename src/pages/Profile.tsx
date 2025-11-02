import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail, GraduationCap, Calendar, Award } from "lucide-react";

const Profile = () => {
  const user = {
    firstName: "Marie",
    lastName: "Dupont",
    email: "marie.dupont@email.com",
    filiere: "Licence Informatique",
    joinDate: "Septembre 2024",
    totalSessions: 156,
    totalHours: "78h 30m",
  };

  const achievements = [
    { icon: Award, label: "7 jours consécutifs", color: "text-primary" },
    { icon: GraduationCap, label: "50 révisions", color: "text-success" },
    { icon: Calendar, label: "1 mois d'activité", color: "text-warning" },
  ];

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Mon Profil
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérer ton compte et tes paramètres
          </p>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-6 gradient-card border-0 shadow-sm">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="w-24 h-24 border-4 border-primary/20">
              <AvatarFallback className="text-2xl font-bold bg-gradient-primary text-white">
                {user.firstName[0]}{user.lastName[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {user.firstName} {user.lastName}
              </h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </div>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <GraduationCap className="w-4 h-4" />
                  {user.filiere}
                </div>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Calendar className="w-4 h-4" />
                  Membre depuis {user.joinDate}
                </div>
              </div>
            </div>

            <Button variant="outline" className="border-2 hover:bg-muted transition-smooth">
              Modifier le profil
            </Button>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 gradient-card border-0 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Statistiques globales</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Sessions totales</span>
                <span className="text-xl font-bold text-primary">{user.totalSessions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Temps total</span>
                <span className="text-xl font-bold text-secondary">{user.totalHours}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 gradient-card border-0 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Récompenses</h3>
            <div className="space-y-3">
              {achievements.map((achievement, index) => {
                const Icon = achievement.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-smooth"
                  >
                    <div className={`w-10 h-10 rounded-full bg-background flex items-center justify-center ${achievement.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-foreground">{achievement.label}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
