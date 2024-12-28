import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { ScheduleGenerator } from './scheduleGenerator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('🚀 Edge function called: generate-schedule');

  if (req.method === 'OPTIONS') {
    console.log('👋 Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { weekStartDate, userId } = await req.json();
    console.log('📅 Generating schedule for:', { weekStartDate, userId });

    const generator = new ScheduleGenerator();
    const result = await generator.generateSchedule(weekStartDate, userId);

    console.log('✅ Schedule generation completed:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});