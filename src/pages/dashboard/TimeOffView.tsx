import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { TimeOffRequestsList } from "@/components/time-off/TimeOffRequestsList";
import { TimeOffRequestForm } from "@/components/time-off/TimeOffRequestForm";

export default function TimeOffView() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Time Off Requests</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TimeOffRequestForm />
        <TimeOffRequestsList />
      </div>
    </div>
  );
}