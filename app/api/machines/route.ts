import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'

// GET all machines with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const lineId = searchParams.get('lineId')

    if (lineId) {
      // When lineId is provided, get machines through relationship chain
      const { data: lineProcesses, error } = await supabaseAdmin
        .from('line_process')
        .select(`
          process_order,
          process:process_id (
            id,
            name,
            index,
            machine_id,
            machine:machine_id (
              id,
              name_machine,
              status,
              next_maintenance,
              last_maintenance,
              total_running_hours
            )
          )
        `)
        .eq('line_id', lineId)
        .order('process_order', { ascending: true })

      if (error) {
        console.error('Error fetching machines by line:', error)
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch machines'
        }, { status: 500 })
      }

      const machines = (lineProcesses || [])
        .map((lp: any) => lp.process?.machine)
        .filter(Boolean)

      return NextResponse.json({
        success: true,
        data: machines
      })
    }

    // Default: get all machines
    let query = supabaseAdmin
      .from('machine')
      .select('*')
      .order('name_machine', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: machines, error } = await query

    if (error) {
      console.error('Error fetching machines:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch machines'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: machines || []
    })
  } catch (error) {
    console.error('Error fetching machines:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch machines'
    }, { status: 500 })
  }
}

// POST create new machine
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { process_id, ...machineData } = body

    const { data: machine, error } = await supabaseAdmin
      .from('machine')
      .insert({ ...machineData, status: machineData.status || 'inactive' })
      .select()
      .single()

    if (error) {
      console.error('Error creating machine:', error)
      return NextResponse.json({ error: 'Failed to create machine' }, { status: 500 })
    }

    // Link machine to selected process
    if (process_id && machine.id) {
      const { error: processError } = await supabaseAdmin
        .from('process')
        .update({ machine_id: machine.id })
        .eq('id', process_id)

      if (processError) {
        console.error('Error linking machine to process:', processError)
      }
    }

    return NextResponse.json(machine, { status: 201 })
  } catch (error) {
    console.error('Error creating machine:', error)
    return NextResponse.json({ error: 'Failed to create machine' }, { status: 500 })
  }
}

// PUT update machine
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { data: machine, error } = await supabaseAdmin
      .from('machine')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating machine:', error)
      return NextResponse.json({ error: 'Failed to update machine' }, { status: 500 })
    }

    return NextResponse.json(machine)
  } catch (error) {
    console.error('Error updating machine:', error)
    return NextResponse.json({ error: 'Failed to update machine' }, { status: 500 })
  }
}

// DELETE machine
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('machine')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting machine:', error)
      return NextResponse.json({ error: 'Failed to delete machine' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Machine deleted successfully' })
  } catch (error) {
    console.error('Error deleting machine:', error)
    return NextResponse.json({ error: 'Failed to delete machine' }, { status: 500 })
  }
}