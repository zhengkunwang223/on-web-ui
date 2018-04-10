import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Comparator, StringFilter } from "@clr/angular";
import { Subject } from 'rxjs/Subject';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs/Observable';

import {
  AlphabeticalComparator,
  StringOperator,
  ObjectFilterByKey,
  createFilters,
  createComparator
} from '../../utils/inventory-operator';
import { FormsModule, ReactiveFormsModule, FormGroup,FormControl }   from '@angular/forms';
import * as _ from 'lodash';
import { WorkflowService } from 'app/services/rackhd/workflow.service';
import { GraphService } from 'app/services/rackhd/graph.service';
import { Workflow, ModalTypes, HISTORY_WORKFLOW_STATUS } from 'app/models';

@Component({
  selector: 'app-history-workflow',
  templateUrl: './history-workflow.component.html',
  styleUrls: ['./history-workflow.component.scss'],
  encapsulation: ViewEncapsulation.None
})

export class HistoryWorkflowComponent implements OnInit {
  workflowsStore: Workflow[] = [];
  allWorkflows: Workflow[] = [];
  selectedWorkflows: Workflow[] = [];
  selectedWorkflow: Workflow;

  action: string;
  isShowModal: boolean;
  rawData: string;

  searchTerms = new Subject<string>();

  selectedStatus: string;
  statusCountMatrix: {};
  statusFilterValue: string;

  // data grid helper
  dgDataLoading = false;
  dgPlaceholder = 'No history workflow found!';
  
  modalTypes: ModalTypes;

  idFilter: any;
  instanceIdFilter: any;
  nodeFilter: any;
  nameFilter: any; 
  injectableNameFilter: any; 
  domainFilter: any; 
  defintionFilter: any; 
  contextFilter: any; 
  tasksFilter: any; 
  statusFilter: any;

  nodeComparator: any; 
  nameComparator: any;
  injectableNameComparator: any;
  domainComparator: any;
  statusComparator: any;

  constructor(
    private workflowService: WorkflowService,
    private graphService: GraphService,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef
  ){
    createFilters(
      this,
      [
        'node', 'instanceId', 'id', 'name', 'injectableName', 'domain',
        'definition', 'context', 'tasks', 'serviceGraph', 'status'
      ],
      new Workflow()
    );
    createComparator(this, ["node", "name", "injectableName", "domain", 'status'], new Workflow());
  }

  ngOnInit() {
    this.modalTypes = new ModalTypes(
      ["Detail", "Tasks", "Options", "Instance Id", "Context", "Definition"]
    );
    this.isShowModal = false;
    this.getAll();
    let searchTrigger = this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term: string) => {
        this.searchWorkflow(term);
        return 'whatever';
      })
    );
    searchTrigger.subscribe();
  }

  getAll(): void {
    this.workflowService.getAllHistory()
      .subscribe(data => {
        this.workflowsStore = data;
        this.allWorkflows = data;
        this.dgDataLoading = false;
        this.collectStatusType();
      });
  }

  get statusTypes(){
    return HISTORY_WORKFLOW_STATUS;
  }

  selectStatus(status: string){
    this.selectedStatus = this.selectedStatus === status ? '' : status;
    this.statusFilterValue = this.selectedStatus;
    this.changeDetectorRef.detectChanges();
  };

  collectStatusType() {
    this.statusCountMatrix = _.transform(this.allWorkflows, (result, item) => {
      let type = item.status;
      result[type] ? result[type] += 1 : result[type] = 1;
    }, []);
  }

  getMetaData(identifier: string): void {
    this.workflowService.getByIdentifier(identifier)
    .subscribe(data => {
      this.rawData = data;
      this.isShowModal = true;
    })
  }

  deleteWorkflows(){
    let promises = [];
    _.forEach(this.selectedWorkflows, workflow => {
      promises.push(this.workflowService.delete(workflow.instanceId).toPromise());
    });
    return Promise.all(promises)
    .then(() => {
      this.onRefresh();
      this.isShowModal = false;
    });
  }

  //getRawData(identifier: string): void {}

  searchWorkflow(term: string){
    this.dgDataLoading = true;
    this.workflowsStore = StringOperator.search(term,this.allWorkflows);
    this.dgDataLoading = false;
  }

  getHttpMethod(){
  }

  getChild(objKey: string, workflow: Workflow){
    this.selectedWorkflow = workflow;
    this.action = _.startCase(objKey);
    this.rawData = workflow && workflow[objKey];
    this.isShowModal = true;
  }
  
  getDefinition(workflow: Workflow){
    this.selectedWorkflow = workflow;
    let graphName = workflow.definition.split('/').pop();
    this.graphService.getByIdentifier(graphName).subscribe(
      data => {
        this.rawData = data;
        this.action = "Definition"
        this.isShowModal = true;
      }
    )
  }

  onRefresh() {
    this.isShowModal = false;
    this.dgDataLoading = true;
    this.getAll();
  }

  onBatchDelete() {
    if (!_.isEmpty(this.selectedWorkflows)){
      this.action = "Delete";
      this.isShowModal = true;
    }
  };

  onDelete(workflow: Workflow) {
    this.selectedWorkflows = [workflow];
    this.action = "Delete";
    this.isShowModal = true;
  };

  onBatchCancel() {
    if (!_.isEmpty(this.selectedWorkflows)){
      this.action = "Cancel";
      this.isShowModal = true;
    }
  };

  onCancel(workflow: Workflow) {
    this.selectedWorkflows = [workflow];
    this.action = "Cancel";
    this.isShowModal = true;
  };

  // onCreate(){}

  onSearch(term: string): void {
    this.searchTerms.next(term);
  }

  // onUpdate(workflow: Workflow){}

  onGetDetails(workflow: Workflow) {
    this.selectedWorkflow = workflow;
    this.action = "Detail";
    this.getMetaData(workflow.instanceId);
  };

  // onGetRawData() {};

  // onChange(){}

  // onCancel(){}

  gotoCanvas(workflow){
    let graphId = workflow.instanceId;
    let url = "/operationsCenter/workflowViewer?graphId=" + graphId;
    this.router.navigateByUrl(url);
  }

  // onCreateSubmit(){}

  onSubmit(){
    this.deleteWorkflows();
  }
}
