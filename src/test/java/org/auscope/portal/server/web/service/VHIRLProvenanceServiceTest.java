package org.auscope.portal.server.web.service;

import au.csiro.promsclient.Activity;
import au.csiro.promsclient.Entity;
import com.hp.hpl.jena.rdf.model.Model;
import com.hp.hpl.jena.rdf.model.ModelFactory;
import junit.framework.Assert;
import junit.framework.TestCase;
import org.auscope.portal.core.cloud.CloudFileInformation;
import org.auscope.portal.core.services.cloud.CloudStorageService;
import org.auscope.portal.core.test.PortalTestClass;
import org.auscope.portal.server.vegl.VEGLJob;
import org.auscope.portal.server.vegl.VglDownload;
import org.jmock.Expectations;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.io.*;
import java.net.URI;
import java.net.URL;
import java.util.*;

public class VHIRLProvenanceServiceTest extends PortalTestClass {
    VEGLJob preparedJob;
    final String serverURL = "http://portal-fake.vhirl.org";
    final Model plainModel = ModelFactory.createDefaultModel();
    final CloudFileInformation fileInformation = context.mock(CloudFileInformation.class);
    final int jobID = 1;
    final String cloudKey = "cloudKey";
    final String cloudServiceID = "fluffy Cloud";
    final String jobName = "Cool Job";
    final String jobDescription = "Some job I made.";
    final String activityFileName = "activity.ttl";
    List<VglDownload> downloads = new ArrayList<>();
    VEGLJob turtleJob;

    final String initalTurtle = "<http://portal-fake.vhirl.org/secure/getJobObject.do?jobId=1>" + System.lineSeparator() +
            "      a       <http://www.w3.org/ns/prov#Activity> ;" + System.lineSeparator();

    final String intermediateTurtle =
            "      a       <http://www.w3.org/ns/prov#Entity> ;" + System.lineSeparator() +
            "      <http://www.w3.org/ns/dcat#downloadURL>" + System.lineSeparator() +
            "              \"http://portal-fake.vhirl.org/secure/jobFile.do?jobId=1&key=activity.ttl\"^^<http://www.w3.org/2001/XMLSchema#anyURI> ;" + System.lineSeparator() +
            "      <http://www.w3.org/ns/prov#wasAttributedTo>" + System.lineSeparator() +
            "              \"mailto:foo@test.com\"^^<http://www.w3.org/2001/XMLSchema#string> .";

    final String endedTurtle = "<http://www.w3.org/ns/prov#endedAtTime>";
    final String file1Turtle =
            "      a       <http://www.w3.org/ns/prov#Entity> ;" + System.lineSeparator() +
            "      <http://www.w3.org/ns/dcat#downloadURL>" + System.lineSeparator() +
            "              \"http://portal-fake.vhirl.org/secure/jobFile.do?jobId=1&key=cloudKey\"^^<http://www.w3.org/2001/XMLSchema#anyURI> ;" + System.lineSeparator() +
            "      <http://www.w3.org/ns/prov#wasAttributedTo>" + System.lineSeparator() +
            "              \"mailto:foo@test.com\"^^<http://www.w3.org/2001/XMLSchema#string> .";

    VHIRLProvenanceService vhirlProvenanceService;

    @Before
    public void setUp() throws Exception {
        preparedJob = context.mock(VEGLJob.class);
        final CloudStorageService store = context.mock(CloudStorageService.class);
        final CloudStorageService[] storageServices = {store};
        final VHIRLFileStagingService fileServer = context.mock(VHIRLFileStagingService.class);
        final File activityFile = File.createTempFile("activity", ".ttl");
        URL turtleURL = getClass().getResource("/turtle.ttl");
        final File activityFile2 = new File(turtleURL.toURI());

        vhirlProvenanceService = new VHIRLProvenanceService(fileServer, storageServices);
        vhirlProvenanceService.setServerURL(serverURL);
        VglDownload download = new VglDownload(1);
        download.setUrl("http://portal-uploads.vhirl.org/file1");
        download.setName("file1");
        downloads.add(download);
        CloudFileInformation cloudFileInformation = new CloudFileInformation(cloudKey, 0, "");
        CloudFileInformation cloudFileModel = new CloudFileInformation(activityFileName, 0, "");
        final CloudFileInformation[] cloudList = {cloudFileInformation, cloudFileModel};

        turtleJob = context.mock(VEGLJob.class, "Turtle Mock Job");

        context.checking(new Expectations() {{
            allowing(preparedJob).getId();
            will(returnValue(jobID));
            allowing(preparedJob).getStorageServiceId();
            will(returnValue(cloudServiceID));
            allowing(preparedJob).getJobDownloads();
            will(returnValue(downloads));
            allowing(preparedJob).getName();
            will(returnValue(jobName));
            allowing(preparedJob).getDescription();
            will(returnValue(jobDescription));
            allowing(preparedJob).getProcessDate();
            will(returnValue(new Date()));
            allowing(preparedJob).getUser();
            will(returnValue("foo@test.com"));

            allowing(fileInformation).getCloudKey();
            will(returnValue(cloudKey));

            allowing(fileServer).createLocalFile(activityFileName, preparedJob);
            will(returnValue(activityFile));

            allowing(store).getId();
            will(returnValue(cloudServiceID));
            allowing(store).listJobFiles(preparedJob);
            will(returnValue(cloudList));
            allowing(store).uploadJobFiles(with(any(VEGLJob.class)), with(any(File[].class)));
            allowing(store).getJobFile(preparedJob, activityFileName);
            will(returnValue(new FileInputStream(activityFile2)));

            allowing(turtleJob).getId();
            will(returnValue(1));
        }});
    }

    @After
    public void tearDown() throws Exception {

    }

    @Test
    public void testCreateActivity() throws Exception {
        String graph = vhirlProvenanceService.createActivity(preparedJob);
        Assert.assertTrue(graph.contains(initalTurtle));
        Assert.assertTrue(graph.contains(intermediateTurtle));
    }

    @Test
    public void testUploadModel() throws Exception {
        vhirlProvenanceService.uploadModel(plainModel, preparedJob);
    }

    @Test
    public void testJobURL() throws Exception {
        String url = VHIRLProvenanceService.jobURL(preparedJob, serverURL);
        Assert.assertEquals(serverURL + "/secure/getJobObject.do?jobId=1", url);
    }

    @Test
    public void testOutputURL() throws Exception {
        String url = VHIRLProvenanceService.outputURL(preparedJob, fileInformation, serverURL);
        Assert.assertEquals(serverURL + "/secure/jobFile.do?jobId=1&key=cloudKey", url);
    }

    @Test
    public void testCreateEntitiesForInputs() throws Exception {
        Set<Entity> entities = vhirlProvenanceService.createEntitiesForInputs(preparedJob);
        Assert.assertNotNull(entities);
        Assert.assertEquals(3, entities.size());
    }

    @Test
    public void testCreateEntitiesForOutputs() throws Exception {
        String graph = vhirlProvenanceService.createEntitiesForOutputs(preparedJob);
        Assert.assertTrue(graph.contains(initalTurtle));
        Assert.assertTrue(graph.contains(endedTurtle));
    }

    @Test
    public void testSetFromModel() throws Exception {
        Set<Entity> outputs = new HashSet<>();
        InputStream activityStream = getClass().getResourceAsStream("/activity.ttl");
        Activity activity;
        Model model = ModelFactory.createDefaultModel();
        model = model.read(activityStream,
                serverURL,
                "TURTLE");
        activity = new Activity().setActivityUri(new URI(
                vhirlProvenanceService.jobURL(turtleJob, serverURL))).setFromModel(model);
        if (activity != null) {
            activity.setEndedAtTime(new Date());
            String outputURL = serverURL + "/secure/jobFile.do?jobId=21&key=job-macgo-bt-everbloom_gmail_com-0000000021/1000_yrRP_hazard_map.png";
            outputs.add(new Entity().setDataUri(new URI(outputURL)).setWasAttributedTo(new URI("mailto:jo@blogs.com")));
            activity.setGeneratedEntities(outputs);
            StringWriter out = new StringWriter();
            activity.getGraph().write(out, "TURTLE", serverURL);
            String turtle = out.toString();
            Assert.assertTrue(turtle.contains(initalTurtle));
            Assert.assertTrue(turtle.contains(endedTurtle));
            Assert.assertTrue(turtle.contains(file1Turtle));
            Assert.assertTrue(turtle.contains(outputURL));
        }
    }
}