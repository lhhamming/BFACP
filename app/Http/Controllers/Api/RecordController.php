<?php

namespace BFACP\Http\Controllers\Api;

use BFACP\Http\Controllers\Controller;
use BFACP\Http\Resources\Adkats\Record as RecordResource;
use BFACP\Realm\Adkats\Record;
use Illuminate\Http\Request;

/**
 * Class RecordController
 * @package BFACP\Http\Controllers\Api
 */
class RecordController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @param \BFACP\Realm\Adkats\Record $record
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Record $record)
    {
        return RecordResource::collection($record->paginate(30));
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     *
     * @param  \BFACP\Realm\Adkats\Record $record
     *
     * @return \BFACP\Http\Resources\Adkats\Record
     */
    public function show(Record $record)
    {
        return response()->success(null, (new RecordResource($record)));
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  \BFACP\Realm\Adkats\Record $record
     *
     * @return \Illuminate\Http\Response
     */
    public function edit(Record $record)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request   $request
     * @param  \BFACP\Realm\Adkats\Record $record
     *
     * @return \Illuminate\Http\Response|string
     */
    public function update(Request $request, Record $record)
    {
        $request->validate([
            'record_message' => 'required|filled|min:1|max:500',
        ]);

        $record_message = trim($request->get('record_message', $record->record_message));

        $record->record_message = $record_message;

        if (! $record->isDirty()) {
            return response()->error('No changes detected. Record not updated.');
        }

        $record->save();

        return response()->success('Record has been updated.', (new RecordResource($record)));
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \BFACP\Realm\Adkats\Record $record
     *
     * @return \Illuminate\Http\Response
     */
    public function destroy(Record $record)
    {
        //
    }
}