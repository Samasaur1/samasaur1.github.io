---
layout: post
title: 'Setting Up A Blank 2021 FRC Project'
date: 2021-01-16 16:08 -0500
tags:
  - frc
  - gradle
  - java
---
Our FRC team, [AFS RooBotics](https://github.com/Roobotics-FRC), uses GradleRIO but not VS Code and the official plugins. We use the free educational version of IntelliJ, but that means that we need to set up our projects each year on our own. That's complicated. What does it entail?

Our team has [a skeleton project from 2019](https://github.com/Roobotics-FRC/RooSkeleton2019) that's a template on GitHub, theoretically allowing us to create a duplicate project with all the boilerplate that we need. As you may have guessed, it's not that simple.

We keep our `master`/`main` branch clean until we merge code that we've *used at competitions* into it — because we didn't go to any competitions last year, our `master` branch on [our 2020 code](https://github.com/Roobotics-FRC/RooBot2020) was pretty much just a template as well. Because there were changes to GradleRIO and the structure of how WPILib is installed, I decided to go with a mix of our 2020 code and our skeleton project.

I cloned our 2020 code (using the [GitHub CLI](https://cli.github.com)): <kbd>gh repo clone Roobotics-FRC/RooBot2020</kbd>.<br/>
I updated the year in `settings.gradle`:
```groovy
import org.gradle.internal.os.OperatingSystem

pluginManagement {
    repositories {
        mavenLocal()
        gradlePluginPortal()
        String frcYear = '2021'
        File frcHome
        if (OperatingSystem.current().isWindows()) {
            String publicFolder = System.getenv('PUBLIC')
            if (publicFolder == null) {
                publicFolder = "C:\\Users\\Public"
            }
            def homeRoot = new File(publicFolder, "wpilib")
            frcHome = new File(homeRoot, frcYear)
        } else {
            def userFolder = System.getProperty("user.home")
            def homeRoot = new File(userFolder, "wpilib")
            frcHome = new File(homeRoot, frcYear)
        }
        def frcHomeMaven = new File(frcHome, 'maven')
        maven {
            name 'frcHome'
            url frcHomeMaven
        }
    }
}
```
Because I took this from the 2020 repo, it uses `~/wpilib/$YEAR` rather than `~/frc$YEAR`.<br/>
I upgraded GradleRIO [as shown on its GitHub page](https://github.com/wpilibsuite/GradleRIO#user-content-upgrading):
```groovy
import org.gradle.internal.os.OperatingSystem

buildscript {
    repositories {
        jcenter()
    }
}

plugins {
    id "java"
    id "checkstyle"
    id "edu.wpi.first.GradleRIO" version "2021.1.2"
    id "idea"
    id "com.github.spotbugs" version "3.0.0"
}

sourceCompatibility = 11
targetCompatibility = 11

repositories {
    mavenCentral()
}

checkstyle {
    //noinspection GroovyAssignabilityCheck
    configFile = rootProject.file('config/checkstyle/checkstyle.xml')
    toolVersion = '7.1.2'
}

spotbugs {
    toolVersion = '3.1.11'
    effort = 'max'
    reportLevel = 'low'
    sourceSets = []
}

tasks.withType(com.github.spotbugs.SpotBugsTask) {
    reports {
        xml.enabled = false
        html.enabled = true
    }
}

task roospotbugs(type: GradleBuild) {
    tasks = ['clean', 'build', 'spotbugsMain']
}

def ROBOT_MAIN_CLASS = "frc.team4373.robot.Main"

ext.isMacOS = OperatingSystem.current().isMacOsX()
ext.network = ''

task switchTo4373 {
    doLast {
        if (isMacOS) {
            Process curNetProc = Runtime.getRuntime().exec('networksetup -getairportnetwork en0')
            BufferedReader stdInput = new BufferedReader(new InputStreamReader(curNetProc.getInputStream()))
            String res = stdInput.readLine()
            network = res.substring(23)
            curNetProc.waitFor()
            if (network != '4373') {
                println 'Connecting to 4373…'
                Process setProc = Runtime.getRuntime().exec('networksetup -setairportnetwork en0 4373 && sleep 3')
                setProc.waitFor()
                println 'Connected to 4373'
            } else {
                println 'Already connected to 4373'
            }
        }
    }
}

task switchBack {
    doLast {
        if (isMacOS && network != '4373') {
            println 'Reconnecting to ' + network + '…'
            Process resetProc = Runtime.getRuntime().exec('sleep 5 && networksetup -setairportnetwork en0 ' + network)
            resetProc.waitFor()
            println 'Reconnected to ' + network
        }
    }
}

task roodeploy(type: GradleBuild) {
    tasks = ['switchTo4373', 'deploy', 'switchBack']
}

// Define my targets (RoboRIO) and artifacts (deployable files)
// This is added by GradleRIO's backing project EmbeddedTools.
deploy {
    targets {
        roboRIO("roborio") {
            // Team number is loaded either from the .wpilib/wpilib_preferences.json
            // or from command line. If not found an exception will be thrown.
            // You can use getTeamOrDefault(team) instead of getTeamNumber if you
            // want to store a team number in this file.
            team = frc.getTeamNumber()
        }
    }
    artifacts {
        frcJavaArtifact('frcJava') {
            targets << "roborio"
            // Debug can be overridden by command line, for use with VSCode
            debug = frc.getDebugOrDefault(false)
        }
        // Built in artifact to deploy arbitrary files to the roboRIO.
        fileTreeArtifact('frcStaticFileDeploy') {
            // The directory below is the local directory to deploy
            files = fileTree(dir: 'src/main/deploy')
            // Deploy to RoboRIO target, into /home/lvuser/deploy
            targets << "roborio"
            directory = '/home/lvuser/deploy'
        }
    }
}

// Defining my dependencies. In this case, WPILib (+ friends), and vendor libraries.
// Also defines JUnit 4.
dependencies {
    implementation wpi.deps.wpilib()
    nativeZip wpi.deps.wpilibJni(wpi.platforms.roborio)
    nativeDesktopZip wpi.deps.wpilibJni(wpi.platforms.desktop)


    implementation wpi.deps.vendor.java()
    nativeZip wpi.deps.vendor.jni(wpi.platforms.roborio)
    nativeDesktopZip wpi.deps.vendor.jni(wpi.platforms.desktop)

    // In Java for now, the argument must be false
    simulation wpi.deps.sim.gui(wpi.platforms.desktop, false)

    testImplementation 'junit:junit:4.12'
}

// Setting up my Jar File. In this case, adding all libraries into the main jar ('fat jar')
// in order to make them all available at runtime. Also adding the manifest so WPILib
// knows where to look for our Robot Class.
jar {
    from { configurations.runtimeClasspath.collect { it.isDirectory() ? it : zipTree(it) } }
    manifest edu.wpi.first.gradlerio.GradleRIOPlugin.javaManifest(ROBOT_MAIN_CLASS)
}

wrapper {
    gradleVersion = '5.0'
}
```
and specified the `sourceCompatibility` and `targetCompatibility` versions as Java 11.<br/>
I replaced the old WPI command based library with the new command based library:<br/><kbd>rm vendordeps/WPILibOldCommands.json; cp ~/wpilib/2021/vendordeps/WPILibNewCommands.json vendordeps/</kbd>.<br/>
I updated the project year in `.wpilib/wpilib_preferences.json`:
```json
{
  "enableCppIntellisense": false,
  "currentLanguage": "java",
  "projectYear": "2021",
  "teamNumber": 4373
}
```
I changed from calling `Scheduler.getInstance().run();` to calling `CommandScheduler.getInstance().run();` (and moved it to `robotPeriodic`), because we're now using the new command-based library.
```java
package frc.team4373.robot;

import edu.wpi.first.wpilibj.TimedRobot;
import edu.wpi.first.wpilibj2.command.CommandScheduler;

/**
 * The VM is configured to automatically run this class, and to call the
 * functions corresponding to each mode, as described in the TimedRobot
 * documentation. If you change the name of this class or the package after
 * creating this project, you must also update the build.gradle file in the
 * project.
 */
public class Robot extends TimedRobot {
    /**
     * Constructor for the Robot class. Variable initialization occurs here;
     * WPILib-related setup should occur in {@link #robotInit}.
     */
    public Robot() {
    }

    /**
     * This function is run when the robot is first started up and should be
     * used for any initialization code.
     *
     * <p>All SmartDashboard fields should be initially added here.</p>
     */
    @Override
    public void robotInit() {
    }

    /**
     * This function is called every robot packet, no matter the mode. Use
     * this for items like diagnostics that you want run during disabled,
     * autonomous, teleoperated, and test.
     *
     * <p>This runs after the mode-specific periodic functions but before
     * LiveWindow and SmartDashboard integrated updating.
     */
    @Override
    public void robotPeriodic() {
        CommandScheduler.getInstance().run();
    }

    /**
     * This function is called once when Sandstorm mode starts.
     */
    @Override
    public void autonomousInit() {
    }

    /**
     * This function is called once when teleoperated mode starts.
     */
    @Override
    public void teleopInit() {
    }

    /**
     * This function is called periodically during Sandstorm mode.
     */
    @Override
    public void autonomousPeriodic() {
    }

    /**
     * This function is called periodically during operator control.
     */
    @Override
    public void teleopPeriodic() {
    }

    /**
     * This function is called periodically during test mode.
     */
    @Override
    public void testPeriodic() {
    }

    /**
     * This function runs periodically in disabled mode.
     * It is used to verify that the selected auton configuration is legal.
     * <br>
     * <b>UNDER NO CIRCUMSTANCES SHOULD SUBSYSTEMS BE ACCESSED OR ENGAGED IN THIS METHOD.</b>
     */
    @Override
    public void disabledPeriodic() {
    }
}
```
Then I updated our README file, and "cherry-picked" (manually) a commit from our skeleton project.

That leaves us with [the project at this commit](https://github.com/Roobotics-FRC/RooBot2021/tree/90abd5d2521e3a9c4ecd467fad337acb73198ecd), a 2021 empty robot project.

***

Side note: while writing this, I ran into my usual problem of IntelliJ being able to run `./gradlew build`, while running it on the command line failed. I finally was able to figure this out: my `~/.gradle/gradle.properties` specified my Gradle JVM, which IntelliJ could override, but it meant that my command-line Gradle could only build projects with that JDK.
