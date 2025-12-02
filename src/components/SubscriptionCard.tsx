import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription, FEATURE_LIMITS } from "@/hooks/useSubscription";
import { Crown, Check, Loader2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const SubscriptionCard = () => {
  const { role, isAdmin, subscribed, subscriptionEnd, loading, createCheckout, openCustomerPortal } = useSubscription();
  const { toast } = useToast();

  const handleSubscribe = async () => {
    try {
      await createCheckout();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la session de paiement",
        variant: "destructive",
      });
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le portail de gestion",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const roleLabels = {
    free: 'Gratuit',
    premium: 'Premium',
    admin: 'Administrateur',
  };

  const roleColors = {
    free: 'bg-muted text-muted-foreground',
    premium: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
    admin: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Abonnement
          </CardTitle>
          <Badge className={roleColors[role]}>
            {roleLabels[role]}
          </Badge>
        </div>
        <CardDescription>
          {isAdmin && "Accès administrateur complet"}
          {subscribed && !isAdmin && `Renouvellement: ${new Date(subscriptionEnd!).toLocaleDateString('fr-FR')}`}
          {!subscribed && !isAdmin && "Passez à Premium pour débloquer toutes les fonctionnalités"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Features comparison */}
        {!subscribed && !isAdmin && (
          <div className="grid grid-cols-2 gap-4">
            {/* Free tier */}
            <div className="p-4 rounded-lg border bg-muted/50">
              <h4 className="font-semibold mb-2">Gratuit</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li className="flex items-center gap-1">
                  <Check className="h-3 w-3" /> {FEATURE_LIMITS.free.flashcardsPerDay} flashcards IA/jour
                </li>
                <li className="flex items-center gap-1">
                  <Check className="h-3 w-3" /> {FEATURE_LIMITS.free.aiChatMessages} messages IA/jour
                </li>
                <li className="flex items-center gap-1">
                  <Check className="h-3 w-3" /> {FEATURE_LIMITS.free.maxCourses} cours max
                </li>
                <li className="flex items-center gap-1">
                  <Check className="h-3 w-3" /> {FEATURE_LIMITS.free.maxFlashcardSets} sets de flashcards
                </li>
              </ul>
            </div>
            {/* Premium tier */}
            <div className="p-4 rounded-lg border-2 border-amber-500 bg-amber-500/5">
              <h4 className="font-semibold mb-2 flex items-center gap-1">
                <Crown className="h-4 w-4 text-amber-500" /> Premium
              </h4>
              <ul className="text-sm space-y-1">
                <li className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-amber-500" /> Flashcards IA illimitées
                </li>
                <li className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-amber-500" /> Chat IA illimité
                </li>
                <li className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-amber-500" /> Cours illimités
                </li>
                <li className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-amber-500" /> Sets de flashcards illimités
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!subscribed && !isAdmin && (
          <Button 
            onClick={handleSubscribe} 
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            <Crown className="h-4 w-4 mr-2" />
            Passer à Premium - 10€/mois
          </Button>
        )}

        {subscribed && !isAdmin && (
          <Button 
            onClick={handleManageSubscription} 
            variant="outline"
            className="w-full"
          >
            <Settings className="h-4 w-4 mr-2" />
            Gérer mon abonnement
          </Button>
        )}

        {isAdmin && (
          <div className="text-center text-sm text-muted-foreground py-2">
            En tant qu'administrateur, vous avez accès à toutes les fonctionnalités.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
