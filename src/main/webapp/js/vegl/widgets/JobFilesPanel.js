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

        
        showPNGPreview = function(fileName){
        	var mywindow = Ext.create('Ext.window.Window', {
        	    title:jobFilesGrid.getSelectionModel().getSelection()[0].get('name'),
        	    html: '<img id="preview" src="secure/showImage.do?filename='+jobFilesGrid.getSelectionModel().getSelection()[0].get('name')+'&jobId='+jobFilesGrid.currentJob.get('id')+'&key='+jobFilesGrid.getSelectionModel().getSelection()[0].get('name')+'" style="max-height:100%; max-width:100%;"/>',
        	    height: window.innerHeight,//*.9,
        	    width: window.innerWidth,//*.9,
        	    layout: 'fit',
        	    minHeight: window.innerHeight,//*.9,
        	    minWidth: window.innerWidth,//*.9,
        	    autoScroll: true,
        	    draggable: false,
        	    resizable: false,
    	        listeners : {
    	            onload : {
    	                fn : function() {
    	                    previmg = document.getElementById("preview");
    	                    console.log(previmg);
    	                    console.log("previmg");
    	                	this.setSize(previmg.height, previmg.height);
    	                }
    	            }
    	        }

        	}).show();

        	return false;
        }

        show3DPreview = function(fileName){

        	var mywindow = Ext.create('Ext.window.Window', {
                title:jobFilesGrid.getSelectionModel().getSelection()[0].get('name'),
        	    height: window.innerHeight,//*.9,
        	    width: window.innerWidth,//*.9,
        	    //layout: 'fit',
        	    layout: {
        	    	type: 'vbox',
        	    	align: 'stretch',
        	    	pack: 'start'
        	    },
        	    minHeight: window.innerHeight,//*.9,
        	    minWidth: window.innerWidth,//*.9,
            	draggable: false,
        	    resizable: false,
                items: [{
                    xtype : '3dterrainplot',
                    itemId : 'plot',
                    valueAttr : 'estimate',
                    valueScale : 'log',
                    pointSize: 4,
                    allowSelection : true,
                    flex: 1,
                    listeners: {
                        select: function(plot, data) {
                            var parent = plot.ownerCt.down('#details');

                            if (parent.items.getCount() !== 0) {
                                parent.removeAll(true);
                            }

                            parent.add({
                                xtype: 'datadisplayfield',
                                fieldLabel: plot.xLabel,
                                margin : '10 0 0 0',
                                value: data.x
                            });
                            parent.add({
                                xtype: 'datadisplayfield',
                                fieldLabel: plot.yLabel,
                                margin : '10 0 0 0',
                                value: data.y
                            });
                            parent.add({
                                xtype: 'datadisplayfield',
                                fieldLabel: plot.zLabel,
                                margin : '10 0 0 0',
                                value: data.z
                            });
                            parent.add({
                                xtype: 'datadisplayfield',
                                fieldLabel: 'Estimate',
                                margin : '10 0 0 0',
                                value: data.estimate
                            });
                        },
                        deselect: function(plot) {
                            var parent = plot.ownerCt.down('#details');

                            parent.removeAll(true);
                            parent.add({
                                xtype: 'label',
                                margin: '50 0 0 0',
                                style: {
                                    color: '#888888',
                                    'font-style': 'italic',
                                    'font-size': '14.5px'
                                },
                                text: 'Click a point'
                            });
                            parent.add({
                                xtype: 'label',
                                margin: '2 0 0 0',
                                style: {
                                    color: '#888888',
                                    'font-style': 'italic',
                                    'font-size': '14.5px'
                                },
                                text: 'for more information'
                            });
                        }
                    }
                },
                { xtype: 'container',
                    layout: {
                    	align: 'stretch',
                        type: 'hbox'
                    },
                    items:[
                           {
                        	   xtype: 'button',
                        	   id: 'buttonStage0',
                               text: 'Initial stage',
                           },
                           {
                               xtype: 'button',
                         	   id: 'buttonStage-1',
                               text: 'Previous stage'
                           },
                           {
                         	   xtype: 'label',
                         	   id: 'stageLabel',
                         	   text: 'Stage 0 of 200',
                               margins: '10 10 10 10'
                           },
                           {	
                        	   xtype: 'button',
                        	   id: 'buttonStage+1',
                        	   text: 'Next stage'
                           },
                           {
                        	   xtype: 'button',
                        	   id: 'buttonStageN',
                        	   text: 'Last stage'
                           }
                     ]
                    
                }]
        	}).show()
        	
        	Ext.Ajax.request({
        	url: 'secure/show3DJSON.do?filename='+jobFilesGrid.getSelectionModel().getSelection()[0].get('name')+'&jobId='+jobFilesGrid.currentJob.get('id')+'&key='+jobFilesGrid.getSelectionModel().getSelection()[0].get('name'),
//            url : 'secure/show3DJSON.do',
//            params : {
//                jobId : jobFilesGrid.currentJob.get('id'),
//                name : jobFilesGrid.getSelectionModel().getSelection()[0].get('name')
//            },
            scope : this,
            callback : function(options, success, response) {            	
                if (!success) {
                    return;
                }

                var responseObj = Ext.JSON.decode(response.responseText);
                
                var scatterPlot = mywindow.down('#plot');
                //alert("responseObj");
                console.log(responseObj);
                scatterPlot.xLabel = responseObj.data.xLabel;
                scatterPlot.yLabel = responseObj.data.yLabel;
                scatterPlot.zLabel = responseObj.data.zLabel;

                scatterPlot.plot(responseObj.data);                
            }
        });


        	
        	

//        	    html: '<img src="secure/show3DJSON.do?filename='+jobFilesGrid.getSelectionModel().getSelection()[0].get('name')+'&jobId='+jobFilesGrid.currentJob.get('id')+'&key='+jobFilesGrid.getSelectionModel().getSelection()[0].get('name')+'" />',
//        	    height: window.innerHeight*.8,
//        	    width: window.innerWidth*.8,
//        	    layout: 'fit',
//        	    maxHeight: window.innerHeight*.8,
//        	    maxWidth: window.innerWidth*.8,
//        	    autoScroll: true,
//    	        listeners : {
//    	            onload : {
//    	                fn : function() {
//    	                		this.setSize(null, null);
//    	                }
//    	            }
//    	        }
//
//        	}).show();

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
            		return fileName+" <a href='#' onClick='showPNGPreview()'><img src='img/magglass.gif'></a>";
            	} else if (fileName.indexOf(".json")==fileName.length-5) {
            		return fileName+" <a href='#' onClick='show3DPreview()'><img src='img/magglass.gif'></a>";
            	}
            	return ""+fileName+"";
            	}},
                      { header: 'Size', width: 100, sortable: true, dataIndex: 'size', renderer: Ext.util.Format.fileSize, align: 'right'}
//            	,{
//                    xtype: 'clickcolumn',
//                    dataIndex : 'name',
//                    width: 48,
//                    renderer: function() {
//                        return Ext.DomHelper.markup({
//                            tag : 'img',
//                            width : 16,
//                            height : 16,
//                            style: {
//                                cursor: 'pointer'
//                            },
//                            src: 'img/magglass.gif'
//                        });
//                    },
//                    hasTip : true,
//                    tipRenderer: function() {
//                        return "Click to inspect this file.";
//                    },
//                    listeners : {
//                        columnclick : Ext.bind(this._inspectClickHandler, this)
//                    }
//                }
            	],
            tbar: [{
                text: 'Actions',
                iconCls: 'folder-icon',
                menu: [ this.downloadAction, this.downloadZipAction]
            }]
        });

        this.callParent(arguments);

        this.on('selectionchange', this._onSelectionChange, this);
        this.on('celldblclick', this._onDblClick, this);

        this.addEvents(['preview']);

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

    _inspectClickHandler :  function(value, record, column, tip) {
        this.fireEvent('preview', this, record.get('name'), this.job);
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