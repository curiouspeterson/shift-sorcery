import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useSidebarProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          
          if (error) {
            toast.error("Error fetching profile", {
              description: error.message
            });
            return;
          }
          
          if (data) {
            setProfile(data);
          } else {
            toast.error("Profile not found", {
              description: "Please contact your administrator"
            });
          }
        }
      } catch (error: any) {
        console.error("Profile error:", error);
        toast.error("Error loading profile", {
          description: error.message
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return { profile, isLoading };
}