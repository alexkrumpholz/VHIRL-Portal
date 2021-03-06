/**
 * A Ext.grid.Panel specialisation for rendering the Jobs
 * available to the current user.
 *
 * Adds the following events
 * selectjob : function(vegl.widgets.SeriesPanel panel, vegl.models.Job selection) - fires whenever a new Job is selected
 */
Ext.define('vegl.widgets.JobFilesPanel', {
    extend : 'Ext.grid.Panel',
    alias : 'widget.jobfilespanel',

    currentJob : null,
    downloadAction : null,
    downloadZipAction : null,

    constructor : function(config) {
        var jobFilesGrid = this;

        //Action for downloading a single file
        this.downloadAction = new Ext.Action({
            text: 'Download',
            disabled: true,
            iconCls: 'disk-icon',
            handler: function() {
                var fileRecord = jobFilesGrid.getSelectionModel().getSelection()[0];

                var params = {
                    jobId : jobFilesGrid.currentJob.get('id'),
                    filename : fileRecord.get('name'),
                    key : fileRecord.get('name')
                };

                portal.util.FileDownloader.downloadFile("secure/downloadFile.do", params);
            }
        });

        //Action for downloading one or more files in a zip
        this.downloadZipAction = new Ext.Action({
            text: 'Download as Zip',
            disabled: true,
            iconCls: 'disk-icon',
            handler: function() {
                var files = jobFilesGrid.getSelectionModel().getSelection();

                var fParam = files[0].get('name');
                for (var i = 1; i < files.length; i++) {
                    fParam += ',' + files[i].get('name');
                }

                portal.util.FileDownloader.downloadFile("secure/downloadAsZip.do", {
                    jobId : jobFilesGrid.currentJob.get('id'),
                    files : fParam
                });
            }
        });

        
        showPreview = function(fileName){
        	var mywindow = Ext.create('Ext.window.Window', {
        	    html: '<img src="secure/showImage.do?filename='+jobFilesGrid.getSelectionModel().getSelection()[0].get('name')+'&jobId='+jobFilesGrid.currentJob.get('id')+'&key='+jobFilesGrid.getSelectionModel().getSelection()[0].get('name')+'" />',
        	    height: window.innerHeight*.8,
        	    width: window.innerWidth*.8,
        	    layout: 'fit',
        	    maxHeight: window.innerHeight*.8,
        	    maxWidth: window.innerWidth*.8,
        	    autoScroll: true,
    	        listeners : {
    	            onload : {
    	                fn : function() {
    	                		this.setSize(null, null);
    	                }
    	            }
    	        }

        	}).show();

        	return false;
        }
        
        Ext.apply(config, {
            plugins : [{
                ptype : 'rowcontextmenu',
                contextMenu : Ext.create('Ext.menu.Menu', {
                    items: [this.downloadAction, this.downloadZipAction]
                })
            }],
            multiSelect : true,
            store : Ext.create('Ext.data.Store', {
                model : 'vegl.models.FileRecord',
                proxy : {
                    type : 'ajax',
                    url : 'secure/jobFiles.do',
                    reader : {
                        type : 'json',
                        root : 'data'
                    },
                    listeners : {
                        exception : function(proxy, response, operation) {
                            responseObj = Ext.JSON.decode(response.responseText);
                            errorMsg = responseObj.msg;
                            errorInfo = responseObj.debugInfo;
                            portal.widgets.window.ErrorWindow.showText('Error', errorMsg, errorInfo);
                        }
                    }
                }
            }),
            columns: [{ header: 'Filename', width: 200, sortable: true, dataIndex: 'name', renderer: function(fileName){
            	if (fileName.indexOf(".png")==fileName.length-4) {
            		return fileName+" <a href='#' onClick='showPreview()'><img src='img/magglass.gif'></a>";
            		
            	}
            	return ""+fileName+"";
            	}},
                      { header: 'Size', width: 100, sortable: true, dataIndex: 'size', renderer: Ext.util.Format.fileSize, align: 'right'}],
            tbar: [{
                text: 'Actions',
                iconCls: 'folder-icon',
                menu: [ this.downloadAction, this.downloadZipAction]
            }]
        });

        this.callParent(arguments);

        this.on('selectionchange', this._onSelectionChange, this);
        this.on('celldblclick', this._onDblClick, this);

    },

    _onDblClick : function(view, td, cellIndex, record, tr, rowIndex, e, eOpts) {
        var sm = this.getSelectionModel();

        this.getSelectionModel().select([record], false);
        this.downloadAction.execute();
    },

    _onSelectionChange : function(sm) {
        var totalSelections = this.getSelectionModel().getSelection().length;
        if (totalSelections === 0) {
            this.downloadAction.setDisabled(true);
            this.downloadZipAction.setDisabled(true);
        } else {
            if (totalSelections != 1) {
                this.downloadAction.setDisabled(true);
            } else {
                this.downloadAction.setDisabled(false);
            }
            this.downloadZipAction.setDisabled(false);
        }
    },

    /**
     * Reloads this store with all the jobs for the specified series
     */
    listFilesForJob : function(job) {
        var store = this.getStore();
        var ajaxProxy = store.getProxy();
        ajaxProxy.extraParams.jobId = job.get('id');
        this.currentJob = job;
        store.removeAll(false);
        store.load();
    },

    /**
     * Removes all files from the store and refresh the job files panel
     */
    cleanupDataStore : function() {
        var store = this.getStore();
        store.removeAll(false);
    }
});